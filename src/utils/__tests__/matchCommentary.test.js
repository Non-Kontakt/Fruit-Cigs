import { describe, it, expect } from "vitest";
import {
  initialCommentaryState, enqueue, advance, holdFor, durableOutstanding,
  itemForEvent, itemForPenaltyKick, terminalState, goalCopy, scorerLine,
} from "../matchCommentary.js";

const ctx = (over = {}) => {
  let n = 0;
  return { detail: "full", mob: false, homeName: "Red Lion FC", awayName: "Yeralden", seq: () => ++n, ...over };
};

const goalEvt = (side = "home", minute = 23) =>
  ({ type: "goal", side, minute, player: "Robinson", assister: "Wilson", text: "raw feed text" });

describe("item adaptation — honest featured side", () => {
  it("goals become durable lock+followup items with structured copy", () => {
    const item = itemForEvent(goalEvt(), ctx());
    expect(item.kind).toBe("durable");
    expect(item.goal.lockCopy).toBe("GOAL FOR RED LION FC!");
    expect(item.goal.followUp).toBe("⚽ Robinson 23' (Wilson)");
  });

  it("mobile scorer line omits the assist", () => {
    expect(scorerLine(goalEvt(), { mob: true })).toBe("⚽ Robinson 23'");
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

  it("only scored penalties get the goal treatment", () => {
    const scored = itemForPenaltyKick({ side: "away", player: "Doherty", scored: true }, ctx());
    const missed = itemForPenaltyKick({ side: "away", player: "Doherty", scored: false }, ctx());
    expect(scored.goal.lockCopy).toBe("GOAL FOR YERALDEN!");
    expect(missed.goal).toBeUndefined();
    expect(missed.copy).toContain("misses");
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
    expect(s.copy).toBe("⚽ Robinson 23' (Wilson)");
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
    expect(s.copy).toContain("44'");
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
      "⚽ Robinson 90' (Wilson)",
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
    expect(seen.some(t => t.includes("B misses"))).toBe(true);
  });

  it("instant matches get a settled terminal state, no queue", () => {
    const s = terminalState();
    expect(s.copy).toBe("Full time.");
    expect(durableOutstanding(s)).toBe(false);
    expect(holdFor(s)).toBeNull();
  });
});
