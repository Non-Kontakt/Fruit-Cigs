import { describe, it, expect } from "vitest";
import { indexedDB, IDBKeyRange } from "fake-indexeddb";
import { createStorage, SaveVersionError, SaveCorruptError } from "../storage.js";
import { SAVE_SCHEMA_VERSION, BACKUPS_PER_KEY } from "../db.js";

// The adapter runs against fake-indexeddb here — same async semantics as
// the real thing, no browser required. Each test gets its own database name
// for isolation; the reload test deliberately reuses one.

let n = 0;
const fresh = () =>
  createStorage({ name: `fc-test-${++n}`, indexedDB, IDBKeyRange });

const KEY = "jfg-save-p1-1";

describe("storage adapter — plain key/value", () => {
  it("round-trips values and lists by prefix", async () => {
    const s = fresh();
    await s.set("jfg-profiles", "[]");
    await s.set("jfg-profile-a", "{}");
    expect((await s.get("jfg-profiles")).value).toBe("[]");
    expect(await s.get("missing")).toBeNull();
    const { keys } = await s.list("jfg-profile");
    expect(keys.sort()).toEqual(["jfg-profile-a", "jfg-profiles"]);
    await s.delete("jfg-profiles");
    expect(await s.get("jfg-profiles")).toBeNull();
  });
});

describe("storage adapter — saves and backups", () => {
  it("saves fresh and reads back, no backup for a first write", async () => {
    const s = fresh();
    await s.setSave(KEY, "career-1");
    const r = await s.getSave(KEY);
    expect(r.value).toBe("career-1");
    expect(r.recovered).toBe(false);
    expect(await s.listBackups(KEY)).toEqual([]);
  });

  it("overwriting banks the displaced payload with its reason", async () => {
    const s = fresh();
    await s.setSave(KEY, "career-1");
    await s.setSave(KEY, "career-2", "import");
    expect((await s.getSave(KEY)).value).toBe("career-2");
    const backups = await s.listBackups(KEY);
    expect(backups).toHaveLength(1);
    expect(backups[0].reason).toBe("import");
    const restored = await s.restoreBackup(KEY, backups[0].id);
    expect(restored.value).toBe("career-1");
  });

  it("a failed write leaves the previous save fully intact", async () => {
    const s = fresh();
    await s.setSave(KEY, "known-good");
    // Functions can't be structured-cloned; the put throws inside the
    // transaction and the whole write — backup included — rolls back.
    await expect(s.setSave(KEY, () => {})).rejects.toThrow();
    expect((await s.getSave(KEY)).value).toBe("known-good");
    expect(await s.listBackups(KEY)).toEqual([]);
  });

  it("restore banks the pre-restore state so it is itself undoable", async () => {
    const s = fresh();
    await s.setSave(KEY, "old");
    await s.setSave(KEY, "current");
    const [oldBackup] = await s.listBackups(KEY);
    await s.restoreBackup(KEY, oldBackup.id);
    expect((await s.getSave(KEY)).value).toBe("old");
    const reasons = (await s.listBackups(KEY)).map((b) => b.reason);
    expect(reasons).toContain("pre-restore");
    const pre = (await s.listBackups(KEY)).find((b) => b.reason === "pre-restore");
    await s.restoreBackup(KEY, pre.id);
    expect((await s.getSave(KEY)).value).toBe("current");
  });

  it("retention is bounded and keeps the newest", async () => {
    const s = fresh();
    for (let i = 0; i <= BACKUPS_PER_KEY + 4; i++) {
      await s.setSave(KEY, `v${i}`);
    }
    const backups = await s.listBackups(KEY);
    expect(backups).toHaveLength(BACKUPS_PER_KEY);
    // Newest-first list; the newest displaced payload is the previous write.
    const newest = await s.restoreBackup(KEY, backups[0].id);
    expect(newest.value).toBe(`v${BACKUPS_PER_KEY + 3}`);
  });

  it("a deleted slot stays deleted: tombstone reads null, survives reload", async () => {
    const name = `fc-tombstone-${Date.now()}`;
    const a = createStorage({ name, indexedDB, IDBKeyRange });
    await a.setSave(KEY, "doomed");
    await a.deleteSave(KEY);
    // Deliberate deletion is not accidental loss — no auto-resurrection.
    expect(await a.getSave(KEY)).toBeNull();
    // The banked payload exists, but only the explicit path reaches it.
    const backups = await a.listBackups(KEY);
    expect(backups[0].reason).toBe("delete");
    // A reload (fresh adapter over the same DB) still sees a deleted slot.
    a._db.close();
    const b = createStorage({ name, indexedDB, IDBKeyRange });
    expect(await b.getSave(KEY)).toBeNull();
  });

  it("restoring the delete-backup brings the slot back to life", async () => {
    const s = fresh();
    await s.setSave(KEY, "doomed");
    await s.deleteSave(KEY);
    const [del] = await s.listBackups(KEY);
    await s.restoreBackup(KEY, del.id);
    const r = await s.getSave(KEY);
    expect(r.value).toBe("doomed");
    expect(r.recovered).toBe(false);
    // The tombstone was not banked as a "save" during restore.
    const reasons = (await s.listBackups(KEY)).map((b) => b.reason);
    expect(reasons).not.toContain("pre-restore");
  });

  it("purgeSave removes the save and every backup permanently", async () => {
    const s = fresh();
    await s.setSave(KEY, "v1");
    await s.setSave(KEY, "v2");
    await s.deleteSave(KEY);
    await s.purgeSave(KEY);
    expect(await s.getSave(KEY)).toBeNull();
    expect(await s.listBackups(KEY)).toEqual([]);
    expect(await s._db.kv.get(KEY)).toBeUndefined();
  });

  it("recovers from a missing active record when a backup exists", async () => {
    const s = fresh();
    await s.setSave(KEY, "v1");
    await s.setSave(KEY, "v2");
    // Simulate a lost/corrupt active record.
    await s._db.kv.delete(KEY);
    const r = await s.getSave(KEY);
    expect(r.recovered).toBe(true);
    expect(r.value).toBe("v1");
    expect(r.backupId).toBeDefined();
  });

  it("returns null when neither save nor backups exist", async () => {
    const s = fresh();
    expect(await s.getSave(KEY)).toBeNull();
    expect(await s.getSave(KEY, { validate: () => true })).toBeNull();
  });

  it("a corrupt active payload recovers from the newest valid backup", async () => {
    const s = fresh();
    const valid = JSON.stringify({ teamName: "Red Lion FC" });
    const isJson = (v) => { try { return !!JSON.parse(v)?.teamName; } catch { return false; } };
    await s.setSave(KEY, valid);
    await s.setSave(KEY, "{corrupt-not-json");
    const r = await s.getSave(KEY, { validate: isJson });
    expect(r.recovered).toBe(true);
    expect(r.value).toBe(valid);
  });

  it("a corrupt newest backup is skipped for the next valid one", async () => {
    const s = fresh();
    const isJson = (v) => { try { return !!JSON.parse(v)?.teamName; } catch { return false; } };
    const valid = JSON.stringify({ teamName: "Red Lion FC" });
    await s.setSave(KEY, valid);           // → becomes oldest backup
    await s.setSave(KEY, "{half-written"); // corrupt, → becomes newest backup
    await s.setSave(KEY, "{also-corrupt"); // corrupt active
    const r = await s.getSave(KEY, { validate: isJson });
    expect(r.recovered).toBe(true);
    expect(r.value).toBe(valid);
  });

  it("when everything is corrupt, loading fails clearly and deletes nothing", async () => {
    const s = fresh();
    const isJson = (v) => { try { return !!JSON.parse(v)?.teamName; } catch { return false; } };
    await s.setSave(KEY, "{bad-1");
    await s.setSave(KEY, "{bad-2");
    await expect(s.getSave(KEY, { validate: isJson })).rejects.toThrow(SaveCorruptError);
    // Nothing was deleted by the failed load.
    expect((await s._db.kv.get(KEY)).value).toBe("{bad-2");
    expect(await s.listBackups(KEY)).toHaveLength(1);
  });

  it("setSave refuses to overwrite a newer-build save, leaving it untouched", async () => {
    const s = fresh();
    await s._db.kv.put({ key: KEY, value: "protected", schemaVersion: SAVE_SCHEMA_VERSION + 1 });
    await expect(s.setSave(KEY, "usurper")).rejects.toThrow(SaveVersionError);
    const row = await s._db.kv.get(KEY);
    expect(row.value).toBe("protected");
    expect(row.schemaVersion).toBe(SAVE_SCHEMA_VERSION + 1);
    // Not demoted into the backup ring either.
    expect(await s.listBackups(KEY)).toEqual([]);
  });

  it("restoreBackup refuses a newer-build backup instead of installing it", async () => {
    const s = fresh();
    await s.setSave(KEY, "current");
    const id = await s._db.backups.add({
      key: KEY, value: "from-the-future", schemaVersion: SAVE_SCHEMA_VERSION + 1, reason: "save", createdAt: Date.now(),
    });
    await expect(s.restoreBackup(KEY, id)).rejects.toThrow(SaveVersionError);
    expect((await s.getSave(KEY)).value).toBe("current");
  });

  it("refuses a save written by a newer build, leaving it untouched", async () => {
    const s = fresh();
    await s._db.kv.put({ key: KEY, value: "from-the-future", schemaVersion: SAVE_SCHEMA_VERSION + 1 });
    await expect(s.getSave(KEY)).rejects.toThrow(SaveVersionError);
    // Untouched: the record is still there, still future-versioned.
    const row = await s._db.kv.get(KEY);
    expect(row.value).toBe("from-the-future");
    expect(row.schemaVersion).toBe(SAVE_SCHEMA_VERSION + 1);
  });

  it("orders concurrent writes: the last call wins", async () => {
    const s = fresh();
    await Promise.all([s.setSave(KEY, "first"), s.setSave(KEY, "second")]);
    expect((await s.getSave(KEY)).value).toBe("second");
    const backups = await s.listBackups(KEY);
    expect(backups).toHaveLength(1);
  });

  it("a second adapter over the same database sees the same data", async () => {
    const name = `fc-reload-${Date.now()}`;
    const a = createStorage({ name, indexedDB, IDBKeyRange });
    await a.setSave(KEY, "persisted");
    await a.set("jfg-profiles", "[1]");
    a._db.close();
    const b = createStorage({ name, indexedDB, IDBKeyRange });
    expect((await b.getSave(KEY)).value).toBe("persisted");
    expect((await b.get("jfg-profiles")).value).toBe("[1]");
  });
});
