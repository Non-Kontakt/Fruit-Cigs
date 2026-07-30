import { useCallback, useEffect, useRef, useState } from "react";
import {
  initialCommentaryState, terminalState, enqueue, advance,
  durableOutstanding, itemForEvent, itemForPenaltyKick, createHoldScheduler,
} from "../utils/matchCommentary.js";

// Owns wall-clock time for the commentary machine (#460): the machine
// decides WHAT shows, this hook decides WHEN advance() is due. All
// sequencing rules stay pure and unit-tested in utils/matchCommentary.js;
// this is the only place a timer touches them.
//
// MatchResultScreen pushes raw events/kicks as they occur and renders the
// returned state through MatchCommentaryBox. The queue is presentation
// state only — shownEvents remains the canonical match record.

export function useMatchCommentary({ detail, mob, homeName, awayName, instant = false }) {
  const [state, setState] = useState(() => (instant ? terminalState() : initialCommentaryState()));
  const seqRef = useRef(0);
  const ctxRef = useRef(null);
  ctxRef.current = { detail, mob, homeName, awayName, seq: () => ++seqRef.current };

  // The scheduler keys each deadline to the ACTIVE hold (phase + item id):
  // enqueues during a lock change the state object but not the active hold,
  // so the running deadline is left alone — a queued goal or penalty kick
  // never extends the narration currently holding the box.
  const schedulerRef = useRef(null);
  if (!schedulerRef.current) {
    schedulerRef.current = createHoldScheduler(() => setState((s) => advance(s)));
  }
  useEffect(() => {
    schedulerRef.current.sync(state);
  }, [state]);
  useEffect(() => () => schedulerRef.current.dispose(), []);

  const pushEvent = useCallback((evt) => {
    setState((s) => enqueue(s, itemForEvent(evt, ctxRef.current)));
  }, []);

  const pushPenaltyKick = useCallback((kick) => {
    setState((s) => enqueue(s, itemForPenaltyKick(kick, ctxRef.current)));
  }, []);

  return {
    copy: state.copy,
    side: state.side,
    flashing: state.phase === "lock",
    // CONTINUE and any other narration-discarding action gate on this.
    durableOutstanding: durableOutstanding(state),
    pushEvent,
    pushPenaltyKick,
  };
}
