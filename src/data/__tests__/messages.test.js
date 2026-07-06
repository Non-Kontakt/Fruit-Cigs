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

describe("poachEvent message", () => {
  const players = [
    { name: "Remy Diaby" },
    { name: "Aksel Torvin" },
    { name: "Boma Kesse" },
  ];

  it("offers a sign choice for each of the three players, plus a refusal", () => {
    const msg = MSG.poachEvent("Three players have emerged.", players, 1);
    expect(msg.type).toBe("poach_event");
    expect(msg.poachPlayers).toBe(players);
    expect(msg.poachRivalIdx).toBe(1);
    expect(msg.choices).toHaveLength(4);

    const signChoices = msg.choices.filter(c => c.value !== "decline");
    expect(signChoices).toHaveLength(3);
    signChoices.forEach((c, i) => {
      expect(c.tone).toBe("primary");
      expect(c.label).toBe(`Sign ${players[i].name}`);
    });
  });

  it("the refusal choice is neutral-toned and costs nothing scaled — flat by design", () => {
    const msg = MSG.poachEvent("body", players, 0);
    const decline = msg.choices.find(c => c.value === "decline");
    expect(decline).toBeTruthy();
    expect(decline.tone).toBe("neutral");
    expect(decline.resultText).toMatch(/turned down/i);
  });
});
