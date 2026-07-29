import Dexie from "dexie";

// The game's persistence database. Version 1 is a clean break: game data
// no longer reads or writes localStorage (settings excepted — they stay in
// localStorage via useSettings, deliberately, so a corrupt game DB can never
// take the user's preferences down with it).
//
// Two version numbers live here and they are NOT the same thing:
// - The Dexie schema version (db.version(N)) describes the table layout
//   below and only changes when tables/indexes change.
// - SAVE_SCHEMA_VERSION describes the shape of a stored game-save record
//   and gates loading: a record written by a NEWER build than the one
//   reading it is refused rather than half-parsed.

export const DB_NAME = "fruit-cigs";
export const SAVE_SCHEMA_VERSION = 1;
export const BACKUPS_PER_KEY = 10;

export function createDb({ name = DB_NAME, indexedDB, IDBKeyRange } = {}) {
  const db = indexedDB
    ? new Dexie(name, { indexedDB, IDBKeyRange })
    : new Dexie(name);
  db.version(1).stores({
    // kv: every persisted record, one row per key. Save rows additionally
    // carry schemaVersion + updatedAt; plain rows (profiles, summaries)
    // are { key, value } like the old storage contract.
    kv: "&key",
    // backups: rotating history of save payloads, written atomically with
    // the save replacement that displaced them. Bounded per key.
    backups: "++id, key, createdAt",
  });
  return db;
}
