import { useCallback, useEffect, useRef, useState } from "react";
import {
  initialCommentaryState, terminalState, enqueue, advance, holdFor,
  durableOutstanding, itemForEvent, itemForPenaltyKick,
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
  const timerRef = useRef(null);
  const ctxRef = useRef(null);
  ctxRef.current = { detail, mob, homeName, awayName, seq: () => ++seqRef.current };

  // Schedule (or clear) the advance for the current phase.
  useEffect(() => {
    clearTimeout(timerRef.current);
    const hold = holdFor(state);
    if (hold != null) {
      timerRef.current = setTimeout(() => setState((s) => advance(s)), hold);
    }
    return () => clearTimeout(timerRef.current);
  }, [state]);

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
