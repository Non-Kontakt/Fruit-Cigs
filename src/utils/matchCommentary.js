// Presentation queue for the matchday commentary box (#460).
//
// Raw match events adapt into commentary items; a small explicit state
// machine decides what the box shows and when. This module is pure — no
// React, no timers. The hook that owns wall-clock time drives it via
// enqueue/advance, which is what makes every sequencing rule unit-testable.
//
// Two kinds of item:
// - "durable": FIFO, never dropped — goals, half/full time, MOTM, every
//   penalty kick, and (in KEY detail mode) every event that passed the key
//   filter. CONTINUE must not be reachable while durable items are
//   outstanding.
// - "line": ordinary narration. Shows immediately when the box is free;
//   while a durable item holds the box only the LATEST pending line is
//   kept (coalescing), so a goal lock never builds a stale backlog.
//
// Colour semantics are honest: `side` is the event's featured side —
// home/away kit for home/away events, null (neutral palette) for sideless
// events like half-time, full-time and MOTM. This is NOT possession; the
// engine doesn't record possession.

// Phase durations, owned here so the hook and tests share one truth.
export const LOCK_MS = 1080;      // GOAL FOR X! flicker (12 swaps at 90ms)
export const FOLLOWUP_MS = 1600;  // the goal's scorer line
export const DURABLE_MS = 1100;   // any other durable item's guaranteed hold

const DURABLE_TYPES = new Set(["goal", "halftime", "fulltime", "motm", "red_card"]);

export function goalCopy(teamName) {
  return `GOAL FOR ${String(teamName || "").toUpperCase()}!`;
}

// The box is purely for text (owner ruling): raw engine strings carry emoji
// and score-report syntax that belong to other surfaces.
export function stripPresentation(text) {
  return String(text || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const surname = (name) => String(name || "").trim().split(" ").pop();

// Conversational prose after the flash — no timestamp, no score-report
// syntax; the scorer ledger below the box owns names, assists and minutes.
// Mobile drops the assist sentence (mobile matchday economy).
export function goalProse(evt, { mob = false } = {}) {
  const finish = `${surname(evt.player)} makes no mistake.`;
  const assist = !mob && evt.assister ? ` ${surname(evt.assister)} created the opening.` : "";
  return finish + assist;
}

// Adapt one raw match event into zero or one commentary item.
// ctx: { detail: "full"|"highlights", mob, homeName, awayName, seq() }
export function itemForEvent(evt, ctx) {
  const side = evt.side === "home" || evt.side === "away" ? evt.side : null;
  const id = `c${ctx.seq()}`;
  if (evt.type === "goal") {
    const teamName = evt.side === "home" ? ctx.homeName : ctx.awayName;
    return {
      id, kind: "durable", side,
      goal: { lockCopy: goalCopy(teamName), followUp: goalProse(evt, ctx) },
      copy: goalProse(evt, ctx),
    };
  }
  const durable = ctx.detail === "highlights" || DURABLE_TYPES.has(evt.type);
  return { id, kind: durable ? "durable" : "line", side, copy: stripPresentation(evt.text) };
}

// Penalty kicks: explicit copy; only a SCORED kick gets the goal treatment.
export function itemForPenaltyKick(kick, ctx) {
  const teamName = kick.side === "home" ? ctx.homeName : ctx.awayName;
  const id = `p${ctx.seq()}`;
  if (kick.scored) {
    return {
      id, kind: "durable", side: kick.side,
      goal: { lockCopy: goalCopy(teamName), followUp: `${surname(kick.player)} scores from the spot.` },
      copy: `${surname(kick.player)} scores from the spot.`,
    };
  }
  return { id, kind: "durable", side: kick.side, copy: `${surname(kick.player)} misses from the spot.` };
}

// --- the machine -----------------------------------------------------------
//
// state.phase: "idle" | "line" | "lock" | "followup" | "durable"
// idle/line are interruptible; lock/followup/durable are protected holds.

export function initialCommentaryState(copy = "We're underway.") {
  return {
    phase: "idle",
    copy,
    side: null,
    item: null,        // the durable item currently holding the box
    queue: [],         // durable FIFO
    pendingLine: null, // latest coalesced ordinary line
  };
}

const isBusy = (s) => s.phase === "lock" || s.phase === "followup" || s.phase === "durable";

// True while CONTINUE (or anything that would discard narration) must wait.
export function durableOutstanding(s) {
  return isBusy(s) || s.queue.length > 0;
}

function startItem(state, item) {
  if (item.goal) {
    return { ...state, phase: "lock", copy: item.goal.lockCopy, side: item.side, item };
  }
  if (item.kind === "durable") {
    return { ...state, phase: "durable", copy: item.copy, side: item.side, item };
  }
  return { ...state, phase: "line", copy: item.copy, side: item.side, item: null };
}

// A new item arrives. Interruptible phases show it now; protected phases
// queue durables FIFO and coalesce lines to the latest.
export function enqueue(state, item) {
  if (!isBusy(state)) {
    if (item.kind === "durable") return startItem(state, item);
    return startItem(state, item);
  }
  if (item.kind === "durable") {
    return { ...state, queue: [...state.queue, item] };
  }
  return { ...state, pendingLine: item };
}

// The current phase's hold expired. Locks roll into their follow-up line;
// everything else hands the box to the next durable, else the freshest
// pending line, else settles on what's showing.
export function advance(state) {
  if (state.phase === "lock") {
    return { ...state, phase: "followup", copy: state.item.goal.followUp, side: state.item.side };
  }
  if (state.phase === "followup" || state.phase === "durable") {
    if (state.queue.length > 0) {
      const [next, ...rest] = state.queue;
      return startItem({ ...state, queue: rest }, next);
    }
    if (state.pendingLine) {
      const line = state.pendingLine;
      return startItem({ ...state, pendingLine: null }, line);
    }
    return { ...state, phase: "line", item: null };
  }
  return state;
}

// How long the machine wants to sit in the state's phase before advance()
// is due. null = no scheduled advance (interruptible phases just wait).
export function holdFor(state) {
  if (state.phase === "lock") return LOCK_MS;
  if (state.phase === "followup") return FOLLOWUP_MS;
  if (state.phase === "durable") return DURABLE_MS;
  return null;
}

// Instant matches don't replay a queue — they render this settled terminal
// state directly.
export function terminalState() {
  return { ...initialCommentaryState("Full time."), phase: "line" };
}

// The wall-clock side of the machine, extracted so the timing contract is
// testable without React: a hold's deadline belongs to the ACTIVE phase and
// item. Queue growth and pending-line coalescing during a hold must never
// move that deadline — a second goal queues behind the first, it does not
// extend the first's lock.
export function holdKeyOf(state) {
  return holdFor(state) == null ? null : `${state.phase}:${state.item?.id ?? ""}`;
}

export function createHoldScheduler(onAdvance, timers = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h) }) {
  let armedKey = null;
  let handle = null;
  return {
    sync(state) {
      const key = holdKeyOf(state);
      if (key === armedKey) return; // same active hold — the deadline stands
      timers.clear(handle);
      handle = null;
      armedKey = key;
      if (key != null) handle = timers.set(onAdvance, holdFor(state));
    },
    dispose() {
      timers.clear(handle);
      handle = null;
      armedKey = null;
    },
  };
}
