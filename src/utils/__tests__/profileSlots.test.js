// fake-indexeddb/auto must load before anything imports the storage
// singleton, so the app-wide adapter binds to the fake backend in Node.
import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { storage } from "../../persistence/storage.js";
import { SAVE_SCHEMA_VERSION } from "../../persistence/db.js";
import { SaveVersionError } from "../../persistence/storage.js";
import { scanProfileSlots, getSaveKey } from "../profile.js";

// Integration regression for the slot-picker boundary: the adapter can
// protect a save all it likes — if the scan reports the slot as empty, the
// UI invites an overwrite. These tests run through the REAL scanProfileSlots
// and the real singleton adapter.

const save = (teamName) => JSON.stringify({ teamName, seasonNumber: 3, leagueTier: 9, calendarIndex: 4, gameMode: "casual" });

describe("scanProfileSlots — tri-state boundary", () => {
  it("reports loadable, empty and deleted slots correctly", async () => {
    const pid = "p-ok";
    await storage.setSave(getSaveKey(pid, 1), save("Red Lion FC"));
    await storage.setSave(getSaveKey(pid, 3), save("Doomed FC"));
    await storage.deleteSave(getSaveKey(pid, 3));
    const slots = await scanProfileSlots(pid);
    expect(slots[0]).toMatchObject({ status: "ok", teamName: "Red Lion FC", seasonNumber: 3, week: 5 });
    expect(slots[1]).toBeNull();
    // Deliberately deleted reads as genuinely empty — startable again.
    expect(slots[2]).toBeNull();
  });

  it("an all-corrupt slot is unavailable, never an empty slot", async () => {
    const pid = "p-corrupt";
    await storage.setSave(getSaveKey(pid, 2), "{not-json");
    const slots = await scanProfileSlots(pid);
    expect(slots[1]).toEqual({ status: "unavailable", reason: "corrupt" });
  });

  it("a newer-build slot is unavailable with its own reason", async () => {
    const pid = "p-future";
    await storage._db.kv.put({
      key: getSaveKey(pid, 1),
      value: save("Future FC"),
      schemaVersion: SAVE_SCHEMA_VERSION + 1,
    });
    const slots = await scanProfileSlots(pid);
    expect(slots[0]).toEqual({ status: "unavailable", reason: "newer-version" });
  });

  it("a corrupt active record with a valid backup scans as loadable", async () => {
    const pid = "p-recover";
    await storage.setSave(getSaveKey(pid, 1), save("Backed Up FC"));
    await storage.setSave(getSaveKey(pid, 1), "{torn-write");
    const slots = await scanProfileSlots(pid);
    expect(slots[0]).toMatchObject({ status: "ok", teamName: "Backed Up FC" });
  });

  it("the protected newer-build save cannot be overwritten by a new career", async () => {
    const pid = "p-guard";
    const key = getSaveKey(pid, 1);
    await storage._db.kv.put({
      key, value: save("Future FC"), schemaVersion: SAVE_SCHEMA_VERSION + 1,
    });
    // Even if some path treated the slot as startable, the write itself
    // refuses — the last line of defence behind the UI.
    await expect(storage.setSave(key, save("Usurper FC"))).rejects.toThrow(SaveVersionError);
    expect((await storage._db.kv.get(key)).value).toBe(save("Future FC"));
  });
});
