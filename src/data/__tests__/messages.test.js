import { describe, it, expect } from "vitest";
import { MSG } from "../messages.js";

describe("transfer window beat messages", () => {
  it("transferWindowOpen produces a distinct, non-empty message", () => {
    const msg = MSG.transferWindowOpen();
    expect(msg.title).toBeTruthy();
    expect(msg.body).toMatch(/transfer window is open/i);
    expect(msg.id).toBeTruthy();
  });

  it("transferWindowFinalWeek produces a distinct, non-empty message", () => {
    const msg = MSG.transferWindowFinalWeek();
    expect(msg.title).toBeTruthy();
    expect(msg.body).toMatch(/deadline week/i);
    expect(msg.id).toBeTruthy();
  });

  it("transferWindowClosed produces a distinct, non-empty message", () => {
    const msg = MSG.transferWindowClosed();
    expect(msg.title).toBeTruthy();
    expect(msg.body).toMatch(/closed/i);
    expect(msg.id).toBeTruthy();
  });
});

describe("squadIdentityHeadline message", () => {
  it("produces a distinct, non-empty message carrying the supplied body", () => {
    const msg = MSG.squadIdentityHeadline('"COUNTER-ATTACK KINGS" — The Gazette');
    expect(msg.title).toBeTruthy();
    expect(msg.body).toBe('"COUNTER-ATTACK KINGS" — The Gazette');
    expect(msg.id).toBeTruthy();
  });
});

describe("asstMgrTrainingIntro message", () => {
  it("offers an opt-out choice alongside the two training choices", () => {
    const msg = MSG.asstMgrTrainingIntro();
    expect(msg.choices).toHaveLength(3);
    const optOut = msg.choices.find(c => c.value === "opt_out");
    expect(optOut).toBeTruthy();
    expect(optOut.tone).toBe("neutral");
    expect(optOut.resultText).toBeTruthy();
  });
});
