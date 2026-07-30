import { describe, it, expect, vi } from "vitest";
import {
  initialCommentaryState, enqueue, advance, holdFor, durableOutstanding,
  itemForEvent, itemForPenaltyKick, terminalState, goalCopy, goalProse, stripPresentation,
  createHoldScheduler, holdKeyOf, LOCK_MS, clockBlockedOf, oldestPendingMinute,
} from "../matchCommentary.js";

const ctx = (over = {}) => {
  let n = 0;
  return { detail: "full", mob: false, homeName: "Red Lion FC", awayName: "Yeralden", seq: () => ++n, ...over };
};

const goalEvt = (side = "home", minute = 23) =>
  ({ type: "goal", side, minute, player: "Robinson", assister: "Wilson", text: "raw feed text" });

describe("item adaptation — honest featured side", () => {
  it("goals become durable lock+followup items with conversational prose", () => {
    const item = itemForEvent(goalEvt(), ctx());
    expect(item.kind).toBe("durable");
    expect(item.goal.lockCopy).toBe("GOAL FOR RED LION FC!");
    // No emoji, no timestamp, no score-report syntax — the ledger owns those.
    expect(item.goal.followUp).toBe("Robinson makes no mistake. Wilson created the opening.");
  });

  it("mobile goal prose drops the assist sentence", () => {
    expect(goalProse(goalEvt(), { mob: true })).toBe("Robinson makes no mistake.");
  });

  it("the box is purely for text: raw engine strings lose their emoji", () => {
    expect(stripPresentation("⚽ GOAL! Reid scores! 🎯")).toBe("GOAL! Reid scores!");
    const item = itemForEvent({ type: "chance", side: "home", text: "🔥 Adams shoots — saved!" }, ctx());
    expect(item.copy).toBe("Adams shoots — saved!");
  });

  it("sideless events (halftime/fulltime/motm) map to neutral", () => {
    for (const type of ["halftime", "fulltime", "motm"]) {
      const item = itemForEvent({ type, text: "x" }, ctx());
      expect(item.side).toBeNull();
      expect(item.kind).toBe("durable");
    }
  });

  it("ordinary narration is a coalescable line in FULL, durable in KEY mode", () => {
    expect(itemForEvent({ type: "chance", side: "home", text: "x" }, ctx()).kind).toBe("line");
    expect(itemForEvent({ type: "chance", side: "home", text: "x" }, ctx({ detail: "highlights" })).kind).toBe("durable");
  });

  it("only scored penalties get the goal treatment, all copy emoji-free", () => {
    const scored = itemForPenaltyKick({ side: "away", player: "Max Doherty", scored: true }, ctx());
    const missed = itemForPenaltyKick({ side: "away", player: "Max Doherty", scored: false }, ctx());
    expect(scored.goal.lockCopy).toBe("GOAL FOR YERALDEN!");
    expect(scored.goal.followUp).toBe("Doherty scores from the spot.");
    expect(missed.goal).toBeUndefined();
    expect(missed.copy).toBe("Doherty misses from the spot.");
    expect(missed.kind).toBe("durable");
  });
});

describe("machine sequencing", () => {
  it("opens neutral and shows ordinary lines immediately", () => {
    let s = initialCommentaryState();
    expect(s.copy).toBe("We're underway.");
    s = enqueue(s, { id: "a", kind: "line", side: "home", copy: "one" });
    expect(s.copy).toBe("one");
    s = enqueue(s, { id: "b", kind: "line", side: "away", copy: "two" });
    expect(s.copy).toBe("two");
    expect(durableOutstanding(s)).toBe(false);
  });

  it("a goal locks, follows up, then releases", () => {
    const c = ctx();
    let s = enqueue(initialCommentaryState(), itemForEvent(goalEvt(), c));
    expect(s.phase).toBe("lock");
    expect(s.copy).toBe("GOAL FOR RED LION FC!");
    expect(holdFor(s)).toBeGreaterThan(0);
    s = advance(s);
    expect(s.phase).toBe("followup");
    expect(s.copy).toBe("Robinson makes no mistake. Wilson created the opening.");
    s = advance(s);
    expect(s.phase).toBe("line");
    expect(durableOutstanding(s)).toBe(false);
  });

  it("ordinary lines coalesce to the latest while a goal holds the box", () => {
    const c = ctx();
    let s = enqueue(initialCommentaryState(), itemForEvent(goalEvt(), c));
    s = enqueue(s, { id: "l1", kind: "line", side: "home", copy: "stale" });
    s = enqueue(s, { id: "l2", kind: "line", side: "away", copy: "fresh" });
    expect(s.copy).toBe("GOAL FOR RED LION FC!"); // the lock never flinches
    s = advance(advance(s)); // lock → followup → release
    expect(s.copy).toBe("fresh"); // only the latest survived
  });

  it("a second goal queues behind the first, never restarts it", () => {
    const c = ctx();
    let s = enqueue(initialCommentaryState(), itemForEvent(goalEvt("home", 44), c));
    s = enqueue(s, itemForEvent(goalEvt("away", 45), c));
    expect(s.copy).toBe("GOAL FOR RED LION FC!");
    expect(s.queue).toHaveLength(1);
    s = advance(s);            // → followup of first
    expect(s.copy).toContain("makes no mistake");
    s = advance(s);            // → second goal's lock
    expect(s.phase).toBe("lock");
    expect(s.copy).toBe("GOAL FOR YERALDEN!");
    expect(durableOutstanding(s)).toBe(true);
  });

  it("90' goal → full time → MOTM drain strictly in order", () => {
    const c = ctx();
    let s = initialCommentaryState();
    s = enqueue(s, itemForEvent(goalEvt("home", 90), c));
    s = enqueue(s, itemForEvent({ type: "fulltime", text: "Full time!" }, c));
    s = enqueue(s, itemForEvent({ type: "motm", text: "MOTM: Robinson" }, c));
    const seen = [];
    let guard = 0;
    while ((durableOutstanding(s) || s.phase === "lock") && guard++ < 20) {
      seen.push(s.copy);
      s = advance(s);
    }
    expect(seen).toEqual([
      "GOAL FOR RED LION FC!",
      "Robinson makes no mistake. Wilson created the opening.",
      "Full time!",
      "MOTM: Robinson",
    ]);
  });

  it("rapid penalty kicks are all durable and none are dropped", () => {
    const c = ctx();
    let s = initialCommentaryState();
    const kicks = [
      { side: "home", player: "A", scored: true },
      { side: "away", player: "B", scored: false },
      { side: "home", player: "C", scored: true },
    ];
    for (const k of kicks) s = enqueue(s, itemForPenaltyKick(k, c));
    const seen = [];
    let guard = 0;
    while (durableOutstanding(s) && guard++ < 20) {
      seen.push(s.copy);
      s = advance(s);
    }
    expect(seen.filter(t => t.includes("GOAL FOR"))).toHaveLength(2);
    expect(seen.some(t => t.includes("B misses from the spot"))).toBe(true);
  });

  it("instant matches get a settled terminal state, no queue", () => {
    const s = terminalState();
    expect(s.copy).toBe("Full time.");
    expect(durableOutstanding(s)).toBe(false);
    expect(holdFor(s)).toBeNull();
  });
});

describe("hold scheduler — deadlines belong to the active hold", () => {
  it("enqueueing during a lock does not move the lock's expiry", () => {
    vi.useFakeTimers();
    try {
      const c = ctx();
      const fired = [];
      const scheduler = createHoldScheduler(() => fired.push(vi.now ? vi.now() : Date.now()));
      let s = enqueue(initialCommentaryState(), itemForEvent(goalEvt("home", 44), c));
      scheduler.sync(s); // lock armed for LOCK_MS

      // Halfway through the lock, a second goal and two lines arrive.
      vi.advanceTimersByTime(LOCK_MS / 2);
      s = enqueue(s, itemForEvent(goalEvt("away", 45), c));
      scheduler.sync(s);
      s = enqueue(s, { id: "l1", kind: "line", side: "home", copy: "x" });
      scheduler.sync(s);

      // The original deadline stands: the advance fires at LOCK_MS, not
      // LOCK_MS/2 + LOCK_MS.
      vi.advanceTimersByTime(LOCK_MS / 2);
      expect(fired).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a new active hold re-arms; an unchanged one never does", () => {
    const c = ctx();
    let s1 = enqueue(initialCommentaryState(), itemForEvent(goalEvt(), c));
    const s2 = enqueue(s1, itemForPenaltyKick({ side: "home", player: "A", scored: true }, c));
    // Same active hold before/after the enqueue…
    expect(holdKeyOf(s2)).toBe(holdKeyOf(s1));
    // …and a different key once the machine actually advances to a new item.
    const s3 = advance(advance(s2)); // lock → followup → next durable's lock
    expect(holdKeyOf(s3)).not.toBe(holdKeyOf(s1));
  });

  it("rapid penalty kicks never extend the kick currently holding the box", () => {
    vi.useFakeTimers();
    try {
      const c = ctx();
      let fired = 0;
      const scheduler = createHoldScheduler(() => { fired += 1; });
      let s = enqueue(initialCommentaryState(), itemForPenaltyKick({ side: "home", player: "A", scored: true }, c));
      scheduler.sync(s);
      // Kicks land every 300ms while the lock holds for 1080ms.
      for (const ms of [300, 300, 300]) {
        vi.advanceTimersByTime(ms);
        s = enqueue(s, itemForPenaltyKick({ side: "away", player: "B", scored: false }, c));
        scheduler.sync(s);
      }
      // 900ms elapsed, three enqueues later: the first lock still expires on
      // schedule at 1080ms.
      vi.advanceTimersByTime(LOCK_MS - 900);
      expect(fired).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("clock backpressure signals (#462)", () => {
  it("the clock is blocked through a goal's whole protected presentation", () => {
    const c = ctx();
    let s = enqueue(initialCommentaryState(), itemForEvent(goalEvt("home", 28), c));
    expect(clockBlockedOf(s)).toBe(true);   // lock
    s = advance(s);
    expect(clockBlockedOf(s)).toBe(true);   // follow-up prose too — not just the flash
    s = advance(s);
    expect(clockBlockedOf(s)).toBe(false);  // released
  });

  it("ordinary lines never block the clock; a non-empty queue always does", () => {
    const c = ctx();
    let s = enqueue(initialCommentaryState(), { id: "l", kind: "line", side: "home", copy: "x", minute: 15 });
    expect(clockBlockedOf(s)).toBe(false);
    s = enqueue(s, itemForEvent(goalEvt("home", 20), c));
    s = enqueue(s, itemForEvent(goalEvt("away", 21), c));
    // Active lock plus one queued goal: blocked until BOTH have presented.
    let guard = 0;
    while (clockBlockedOf(s) && guard++ < 10) s = advance(s);
    expect(guard).toBe(4); // lock, followup, lock, followup
  });

  it("oldestPendingMinute tracks the earliest minute still owed", () => {
    const c = ctx();
    let s = initialCommentaryState();
    expect(oldestPendingMinute(s)).toBeNull();
    s = enqueue(s, itemForEvent(goalEvt("home", 62), c));
    s = enqueue(s, itemForEvent({ type: "fulltime", text: "Full time!", minute: 90 }, c));
    expect(oldestPendingMinute(s)).toBe(62);
    s = advance(advance(s)); // 62' goal fully presented → FT active
    expect(oldestPendingMinute(s)).toBe(90);
    s = advance(s);
    expect(oldestPendingMinute(s)).toBeNull();
  });
});
