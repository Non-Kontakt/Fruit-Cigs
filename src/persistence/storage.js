import { createDb, SAVE_SCHEMA_VERSION, BACKUPS_PER_KEY } from "./db.js";

// The one storage adapter. Zustand owns the live game; this module owns
// getting it to disk and back, and nothing else does. Components and hooks
// never touch Dexie directly.
//
// Two tiers of operation:
// - Plain key/value (get/set/remove/list) for profiles, slot summaries and
//   other small records — same contract the old window.storage had.
// - Save-aware (getSave/setSave/deleteSave/listBackups/restoreBackup) for
//   game-save payloads: every replacement atomically banks the displaced
//   payload as a rotating backup in the same transaction, so a failed write
//   changes nothing and a successful one can always be undone.
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
    // Newest first; everything past the retention window goes.
    const ids = await db.backups.where("key").equals(key).primaryKeys();
    if (ids.length <= BACKUPS_PER_KEY) return;
    const rows = await db.backups.where("key").equals(key).sortBy("createdAt");
    const excess = rows.slice(0, rows.length - BACKUPS_PER_KEY);
    await db.backups.bulkDelete(excess.map((r) => r.id));
  }

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

    // Load a save. If the active record is missing but backups exist, the
    // newest backup is returned flagged `recovered` — a readable career
    // always beats a blank one. A record from a newer build throws
    // SaveVersionError and is left exactly as found.
    async getSave(key) {
      const row = await db.kv.get(key);
      if (row !== undefined) {
        if ((row.schemaVersion ?? 1) > SAVE_SCHEMA_VERSION) {
          throw new SaveVersionError(key, row.schemaVersion);
        }
        return { key, value: row.value, recovered: false };
      }
      const backups = await db.backups.where("key").equals(key).sortBy("createdAt");
      const newest = backups[backups.length - 1];
      if (!newest) return null;
      if ((newest.schemaVersion ?? 1) > SAVE_SCHEMA_VERSION) {
        throw new SaveVersionError(key, newest.schemaVersion);
      }
      return { key, value: newest.value, recovered: true, backupId: newest.id };
    },

    // Replace a save. The displaced payload is banked as a backup in the
    // same transaction — the write either fully happens (new save + backup
    // + pruned history) or fully doesn't.
    setSave(key, value, reason = "save") {
      return enqueue(() =>
        db.transaction("rw", db.kv, db.backups, async () => {
          const existing = await db.kv.get(key);
          if (existing !== undefined) {
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

    // Delete a save, banking the deleted payload first — deleting a career
    // is exactly the kind of moment a backup exists for.
    deleteSave(key) {
      return enqueue(() =>
        db.transaction("rw", db.kv, db.backups, async () => {
          const existing = await db.kv.get(key);
          if (existing !== undefined) {
            await db.backups.add({
              key,
              value: existing.value,
              schemaVersion: existing.schemaVersion ?? 1,
              reason: "delete",
              createdAt: Date.now(),
            });
            await db.kv.delete(key);
            await pruneBackups(key);
          }
          return { key, deleted: existing !== undefined };
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

    // Restore a backup over the active save. The current save (if any) is
    // banked as `pre-restore` in the same transaction, so a restore is
    // itself always undoable.
    restoreBackup(key, backupId) {
      return enqueue(() =>
        db.transaction("rw", db.kv, db.backups, async () => {
          const backup = await db.backups.get(backupId);
          if (!backup || backup.key !== key) {
            throw new Error(`No backup ${backupId} for "${key}"`);
          }
          const existing = await db.kv.get(key);
          if (existing !== undefined) {
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
