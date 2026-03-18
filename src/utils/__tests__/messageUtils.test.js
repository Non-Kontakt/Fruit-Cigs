import { describe, it, expect, beforeEach } from "vitest";
import {
  createInboxMessage,
  seedMessageSeq,
  getMessageSeq,
  isMessageVisible,
  inboxSort,
  getVisibleMessages,
  getUnreadCount,
} from "../messageUtils.js";

beforeEach(() => {
  seedMessageSeq(0);
});

// ---------------------------------------------------------------------------
// createInboxMessage
// ---------------------------------------------------------------------------
describe("createInboxMessage", () => {
  const timeCtx = { calendarIndex: 4, seasonNumber: 2 };

  it("auto-stamps week, season, seq, read, id", () => {
    const msg = createInboxMessage({ icon: "📰", title: "Test", body: "Hello", color: "#fff" }, timeCtx);
    expect(msg.week).toBe(5);
    expect(msg.season).toBe(2);
    expect(msg.seq).toBe(0);
    expect(msg.read).toBe(false);
    expect(msg.id).toMatch(/^msg_\d+_0$/);
  });

  it("increments seq across calls", () => {
    const a = createInboxMessage({ title: "A", body: "", icon: "", color: "" }, timeCtx);
    const b = createInboxMessage({ title: "B", body: "", icon: "", color: "" }, timeCtx);
    expect(b.seq).toBe(a.seq + 1);
  });

  it("explicit week overrides auto-stamp", () => {
    const msg = createInboxMessage({ title: "T", body: "", icon: "", color: "", week: 99 }, timeCtx);
    expect(msg.week).toBe(99);
  });

  it("explicit id is preserved", () => {
    const msg = createInboxMessage({ id: "msg_train_123", title: "T", body: "", icon: "", color: "" }, timeCtx);
    expect(msg.id).toBe("msg_train_123");
  });

  it("maps visibleFromIndex to pendingUntilWeek", () => {
    const msg = createInboxMessage({ title: "T", body: "", icon: "", color: "", visibleFromIndex: 7 }, timeCtx);
    expect(msg.pendingUntilWeek).toBe(7);
    expect(msg.visibleFromIndex).toBeUndefined();
  });

  it("does not overwrite explicit pendingUntilWeek with visibleFromIndex", () => {
    const msg = createInboxMessage({ title: "T", body: "", icon: "", color: "", pendingUntilWeek: 3, visibleFromIndex: 7 }, timeCtx);
    expect(msg.pendingUntilWeek).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// seedMessageSeq / getMessageSeq
// ---------------------------------------------------------------------------
describe("seedMessageSeq / getMessageSeq", () => {
  it("round-trips correctly", () => {
    seedMessageSeq(42);
    expect(getMessageSeq()).toBe(42);
    createInboxMessage({ title: "", body: "", icon: "", color: "" }, { calendarIndex: 0, seasonNumber: 1 });
    expect(getMessageSeq()).toBe(43);
  });
});

// ---------------------------------------------------------------------------
// isMessageVisible
// ---------------------------------------------------------------------------
describe("isMessageVisible", () => {
  it("returns true for messages without pendingUntilWeek", () => {
    expect(isMessageVisible({ title: "T" }, 0)).toBe(true);
  });

  it("returns false when calendarIndex < pendingUntilWeek", () => {
    expect(isMessageVisible({ pendingUntilWeek: 5 }, 4)).toBe(false);
  });

  it("returns true when calendarIndex >= pendingUntilWeek", () => {
    expect(isMessageVisible({ pendingUntilWeek: 5 }, 5)).toBe(true);
    expect(isMessageVisible({ pendingUntilWeek: 5 }, 6)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// inboxSort
// ---------------------------------------------------------------------------
describe("inboxSort", () => {
  it("sorts by season descending", () => {
    const msgs = [
      { season: 1, week: 1, seq: 0 },
      { season: 2, week: 1, seq: 1 },
    ];
    msgs.sort(inboxSort);
    expect(msgs[0].season).toBe(2);
  });

  it("sorts by week descending within same season", () => {
    const msgs = [
      { season: 1, week: 3, seq: 0 },
      { season: 1, week: 7, seq: 1 },
    ];
    msgs.sort(inboxSort);
    expect(msgs[0].week).toBe(7);
  });

  it("sorts by seq descending within same season+week", () => {
    const msgs = [
      { season: 1, week: 3, seq: 5 },
      { season: 1, week: 3, seq: 10 },
    ];
    msgs.sort(inboxSort);
    expect(msgs[0].seq).toBe(10);
  });

  it("handles messages without seq (old saves)", () => {
    const msgs = [
      { season: 1, week: 3 },
      { season: 1, week: 3, seq: 5 },
    ];
    msgs.sort(inboxSort);
    expect(msgs[0].seq).toBe(5);
    expect(msgs[1].seq).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getVisibleMessages
// ---------------------------------------------------------------------------
describe("getVisibleMessages", () => {
  it("filters out pending messages and sorts", () => {
    seedMessageSeq(0);
    const timeCtx = { calendarIndex: 3, seasonNumber: 1 };
    const msgs = [
      createInboxMessage({ title: "A", body: "", icon: "", color: "" }, timeCtx),
      createInboxMessage({ title: "B", body: "", icon: "", color: "", visibleFromIndex: 10 }, timeCtx),
      createInboxMessage({ title: "C", body: "", icon: "", color: "" }, timeCtx),
    ];
    const visible = getVisibleMessages(msgs, 3);
    expect(visible).toHaveLength(2);
    expect(visible[0].title).toBe("C"); // higher seq first
    expect(visible[1].title).toBe("A");
  });

  it("returns empty array for null input", () => {
    expect(getVisibleMessages(null, 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------
describe("getUnreadCount", () => {
  it("counts only visible unread messages", () => {
    seedMessageSeq(0);
    const timeCtx = { calendarIndex: 5, seasonNumber: 1 };
    const msgs = [
      createInboxMessage({ title: "A", body: "", icon: "", color: "" }, timeCtx),
      createInboxMessage({ title: "B", body: "", icon: "", color: "", visibleFromIndex: 10 }, timeCtx),
      { ...createInboxMessage({ title: "C", body: "", icon: "", color: "" }, timeCtx), read: true },
      createInboxMessage({ title: "D", body: "", icon: "", color: "" }, timeCtx),
    ];
    expect(getUnreadCount(msgs, 5)).toBe(2); // A and D (B hidden, C read)
  });

  it("returns 0 for null input", () => {
    expect(getUnreadCount(null, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Old save migration
// ---------------------------------------------------------------------------
describe("old save migration", () => {
  it("messages without seq get sequential values via array map", () => {
    const oldMessages = [
      { id: "a", week: 1, season: 1, title: "First", read: false },
      { id: "b", week: 2, season: 1, title: "Second", read: false },
      { id: "c", week: 3, season: 1, title: "Third", read: false },
    ];
    const migrated = oldMessages.map((m, i) => m.seq != null ? m : { ...m, seq: i });
    expect(migrated[0].seq).toBe(0);
    expect(migrated[1].seq).toBe(1);
    expect(migrated[2].seq).toBe(2);

    // Sort preserves original order (oldest first when reversed = newest first)
    const sorted = [...migrated].sort(inboxSort);
    expect(sorted[0].title).toBe("Third");
    expect(sorted[2].title).toBe("First");
  });

  it("max-based reseeding avoids seq conflicts", () => {
    const migrated = [
      { seq: 0 }, { seq: 1 }, { seq: 2 },
    ];
    const maxSeq = migrated.reduce((mx, m) => Math.max(mx, m.seq ?? -1), -1);
    seedMessageSeq(maxSeq + 1);
    expect(getMessageSeq()).toBe(3);
    const next = createInboxMessage({ title: "", body: "", icon: "", color: "" }, { calendarIndex: 0, seasonNumber: 1 });
    expect(next.seq).toBe(3);
  });
});
