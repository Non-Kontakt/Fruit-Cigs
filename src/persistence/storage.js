import { createDb, SAVE_SCHEMA_VERSION, BACKUPS_PER_KEY } from "./db.js";

// The one storage adapter. Zustand owns the live game; this module owns
// getting it to disk and back, and nothing else does. Components and hooks
// never touch Dexie directly.
//
// Two tiers of operation:
// - Plain key/value (get/set/remove/list) for profiles, slot summaries and
//   other small records — same contract the old window.storage had.
// - Save-aware (getSave/setSave/deleteSave/purgeSave/listBackups/
//   restoreBackup) for game-save payloads: every replacement atomically
//   banks the displaced payload as a rotating backup in the same
//   transaction, so a failed write changes nothing and a successful one can
//   always be undone.
//
// Deliberate deletion vs accidental loss is a real distinction here:
// deleteSave writes a tombstone (the career stays restorable through the
// explicit backup path but never resurrects on its own), while a missing or
// unreadable active record with surviving backups is treated as damage and
// recovered from, loudly.
//
// Every mutating call runs through one queue. IndexedDB writes are genuinely
// async, and without strict ordering an older autosave that resolved slowly
// could land on top of a newer one.

export class SaveVersionError extends Error {
  constructor(key, found) {
    super(
      `Save "${key}" was written by a newer build (schema v${found}, this build reads v${SAVE_SCHEMA_VERSION}) and was left untouched.`,
    );
    this.name = "SaveVersionError";
    this.key = key;
    this.found = found;
  }
}

export class SaveCorruptError extends Error {
  constructor(key) {
    super(
      `Save "${key}" exists but neither the active record nor any backup passed validation. Nothing was deleted.`,
    );
    this.name = "SaveCorruptError";
    this.key = key;
  }
}

export function createStorage(dbOptions) {
  const db = createDb(dbOptions);
  let tail = Promise.resolve();
  // Serialize mutations; a rejection must not wedge the queue for the next op.
  const enqueue = (op) => {
    const run = tail.then(op, op);
    tail = run.catch(() => {});
    return run;
  };

  async function pruneBackups(key) {
    const ids = await db.backups.where("key").equals(key).primaryKeys();
    if (ids.length <= BACKUPS_PER_KEY) return;
    const rows = await db.backups.where("key").equals(key).sortBy("createdAt");
    const excess = rows.slice(0, rows.length - BACKUPS_PER_KEY);
    await db.backups.bulkDelete(excess.map((r) => r.id));
  }

  const readable = (row) => (row.schemaVersion ?? 1) <= SAVE_SCHEMA_VERSION;

  return {
    // --- plain key/value (old window.storage contract) --------------------

    async get(key) {
      const row = await db.kv.get(key);
      return row === undefined ? null : { key, value: row.value };
    },

    set(key, value) {
      return enqueue(async () => {
        await db.kv.put({ key, value });
        return { key, value };
      });
    },

    delete(key) {
      return enqueue(async () => {
        await db.kv.delete(key);
        return { key, deleted: true };
      });
    },

    async list(prefix) {
      const keys = await db.kv.toCollection().primaryKeys();
      return { keys: prefix ? keys.filter((k) => k.startsWith(prefix)) : keys };
    },

    // --- save-aware --------------------------------------------------------

    // Load a save.
    // - A tombstoned slot (deliberate deletion) is null: deleted careers
    //   never resurrect on their own; restoreBackup is the explicit way back.
    // - A record from a newer build throws SaveVersionError, untouched.
    // - `validate(value)`, when given, gates the payload: a failing active
    //   record is treated like a missing one and recovery walks the backups
    //   newest-first, skipping any that fail validation or are
    //   version-incompatible.
    // - If records exist but nothing passes, SaveCorruptError — a clear
    //   failure that deletes nothing — rather than a silent empty slot.
    async getSave(key, { validate } = {}) {
      const row = await db.kv.get(key);
      let sawUnreadable = false;

      if (row !== undefined) {
        if (!readable(row)) throw new SaveVersionError(key, row.schemaVersion);
        if (row.deleted) return null;
        if (!validate || validate(row.value)) {
          return { key, value: row.value, recovered: false };
        }
        sawUnreadable = true;
      }

      const backups = await db.backups.where("key").equals(key).sortBy("createdAt");
      for (const b of backups.reverse()) {
        if (!readable(b)) { sawUnreadable = true; continue; }
        if (validate && !validate(b.value)) { sawUnreadable = true; continue; }
        return { key, value: b.value, recovered: true, backupId: b.id };
      }

      if (sawUnreadable || backups.length > 0) throw new SaveCorruptError(key);
      return null;
    },

    // Replace a save. The displaced payload is banked as a backup in the
    // same transaction — the write either fully happens (new save + backup
    // + pruned history) or fully doesn't. Tombstones are never banked.
    setSave(key, value, reason = "save") {
      return enqueue(() =>
        db.transaction("rw", db.kv, db.backups, async () => {
          const existing = await db.kv.get(key);
          if (existing !== undefined && !existing.deleted) {
            await db.backups.add({
              key,
              value: existing.value,
              schemaVersion: existing.schemaVersion ?? 1,
              reason,
              createdAt: Date.now(),
            });
          }
          await db.kv.put({
            key,
            value,
            schemaVersion: SAVE_SCHEMA_VERSION,
            updatedAt: Date.now(),
          });
          await pruneBackups(key);
          return { key, value };
        }),
      );
    },

    // Deliberate deletion: bank the career, then write a tombstone in the
    // same transaction. The slot reads as empty from now on; the payload
    // stays reachable only through the explicit backup path.
    deleteSave(key) {
      return enqueue(() =>
        db.transaction("rw", db.kv, db.backups, async () => {
          const existing = await db.kv.get(key);
          if (existing !== undefined && !existing.deleted) {
            await db.backups.add({
              key,
              value: existing.value,
              schemaVersion: existing.schemaVersion ?? 1,
              reason: "delete",
              createdAt: Date.now(),
            });
            await db.kv.put({
              key,
              value: null,
              deleted: true,
              schemaVersion: SAVE_SCHEMA_VERSION,
              updatedAt: Date.now(),
            });
            await pruneBackups(key);
          }
          return { key, deleted: existing !== undefined && !existing.deleted };
        }),
      );
    },

    // Permanent removal: the active row, its tombstone and every backup go.
    // This is the profile-deletion path — nothing orphaned, nothing
    // restorable, and that is the point.
    purgeSave(key) {
      return enqueue(() =>
        db.transaction("rw", db.kv, db.backups, async () => {
          await db.kv.delete(key);
          await db.backups.where("key").equals(key).delete();
          return { key, purged: true };
        }),
      );
    },

    // Newest first, metadata only — payloads stay in the table.
    async listBackups(key) {
      const rows = await db.backups.where("key").equals(key).sortBy("createdAt");
      return rows
        .reverse()
        .map(({ id, reason, createdAt, schemaVersion }) => ({ id, reason, createdAt, schemaVersion }));
    },

    // Restore a backup over the active save (or over a tombstone — this is
    // the one road back from deliberate deletion). A live current save is
    // banked as `pre-restore` in the same transaction; tombstones are not.
    restoreBackup(key, backupId) {
      return enqueue(() =>
        db.transaction("rw", db.kv, db.backups, async () => {
          const backup = await db.backups.get(backupId);
          if (!backup || backup.key !== key) {
            throw new Error(`No backup ${backupId} for "${key}"`);
          }
          const existing = await db.kv.get(key);
          if (existing !== undefined && !existing.deleted) {
            await db.backups.add({
              key,
              value: existing.value,
              schemaVersion: existing.schemaVersion ?? 1,
              reason: "pre-restore",
              createdAt: Date.now(),
            });
          }
          await db.kv.put({
            key,
            value: backup.value,
            schemaVersion: backup.schemaVersion ?? 1,
            updatedAt: Date.now(),
          });
          await pruneBackups(key);
          return { key, value: backup.value };
        }),
      );
    },

    // Test/reset seam.
    _db: db,
  };
}

// The app-wide singleton. Everything in src/ that persists game data goes
// through this instance.
export const storage = createStorage();
