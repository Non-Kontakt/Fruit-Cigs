import { describe, it, expect } from "vitest";
import { buildSeasonEndSubtitle, tournamentOutcomeLabel } from "../seasonEndMessage.js";

describe("tournamentOutcomeLabel", () => {
  it("labels Dynasty Cup outcomes for the knockout tier", () => {
    expect(tournamentOutcomeLabel(3, null, "winner")).toBe("Won the Dynasty Cup!");
    expect(tournamentOutcomeLabel(3, null, "runner_up")).toBe("Dynasty Cup Runner-up.");
    expect(tournamentOutcomeLabel(3, null, "semi_finalist")).toBe("Dynasty Cup Semi-finalist.");
    expect(tournamentOutcomeLabel(3, null, null)).toBeNull();
  });

  it("labels 5v5 Mini-Tournament outcomes for the mini-tournament tier", () => {
    expect(tournamentOutcomeLabel(2, "winner", null)).toBe("Won the 5v5 Mini-Tournament!");
    expect(tournamentOutcomeLabel(2, "runner_up", null)).toBe("Runner-up in the 5v5 Mini-Tournament.");
    expect(tournamentOutcomeLabel(2, "third_place", null)).toBe("Won the 3rd-place playoff in the 5v5 Mini-Tournament.");
    expect(tournamentOutcomeLabel(2, "eliminated", null)).toBe("Eliminated in the 5v5 Mini-Tournament semi-final.");
    expect(tournamentOutcomeLabel(2, null, null)).toBeNull();
  });

  it("returns null for tiers without a post-league knockout", () => {
    expect(tournamentOutcomeLabel(1, "winner", "winner")).toBeNull();
    expect(tournamentOutcomeLabel(5, "winner", "winner")).toBeNull();
  });
});

describe("buildSeasonEndSubtitle", () => {
  const base = { leagueName: "Euro Dynasty A", newLeagueName: "Intergalactic Elite", fromTier: 3 };

  it("does not claim a hollow 'Champions' win when the Dynasty Cup final was lost", () => {
    const subtitle = buildSeasonEndSubtitle({
      ...base, position: 1, type: "promoted", isInvincible: false, dynastyCupFinish: "runner_up",
    });
    expect(subtitle).toBe("Champions of Euro Dynasty A! Dynasty Cup Runner-up. Moving up to Intergalactic Elite.");
  });

  it("mentions the champion won the Dynasty Cup too", () => {
    const subtitle = buildSeasonEndSubtitle({
      ...base, position: 1, type: "promoted", isInvincible: false, dynastyCupFinish: "winner",
    });
    expect(subtitle).toBe("Champions of Euro Dynasty A! Won the Dynasty Cup! Moving up to Intergalactic Elite.");
  });

  it("credits a non-champion promotion with the Dynasty Cup win", () => {
    const subtitle = buildSeasonEndSubtitle({
      ...base, position: 2, type: "promoted", isInvincible: false, dynastyCupFinish: "winner",
    });
    expect(subtitle).toBe("Won the Dynasty Cup! Promoted to Intergalactic Elite!");
  });

  it("falls back to plain league-position copy when there is no tournament result", () => {
    const subtitle = buildSeasonEndSubtitle({
      ...base, position: 2, type: "promoted", isInvincible: false, dynastyCupFinish: null,
    });
    expect(subtitle).toBe("Finished 2nd in Euro Dynasty A. Promoted to Intergalactic Elite!");
  });

  it("does not mislabel a Mini-Tournament semi-final exit as a 3rd-place playoff win", () => {
    const subtitle = buildSeasonEndSubtitle({
      leagueName: "World XI B", newLeagueName: "Euro Dynasty A", fromTier: 2,
      position: 3, type: "promoted", isInvincible: false, miniTournamentFinish: "eliminated",
    });
    expect(subtitle).toBe("Eliminated in the 5v5 Mini-Tournament semi-final. Promoted to Euro Dynasty A!");
  });

  it("reports a Dynasty Cup run even for a team that stayed in the same tier", () => {
    const subtitle = buildSeasonEndSubtitle({
      ...base, position: 4, type: "stayed", isInvincible: false, dynastyCupFinish: "winner",
    });
    expect(subtitle).toBe("Finished 4th in Euro Dynasty A. Won the Dynasty Cup! Same league next season.");
  });

  it("reports a Dynasty Cup exit for a relegated team", () => {
    const subtitle = buildSeasonEndSubtitle({
      ...base, position: 4, type: "relegated", isInvincible: false, dynastyCupFinish: "semi_finalist",
    });
    expect(subtitle).toBe("Finished 4th in Euro Dynasty A. Dynasty Cup Semi-finalist. Dropping to Intergalactic Elite.");
  });

  it("keeps the undefeated-champions copy intact but adds the cup result", () => {
    const subtitle = buildSeasonEndSubtitle({
      ...base, position: 1, type: "promoted", isInvincible: true, dynastyCupFinish: "runner_up",
    });
    expect(subtitle).toBe("Undefeated champions of Euro Dynasty A! A perfect season. Dynasty Cup Runner-up. Moving up to Intergalactic Elite.");
  });

  it("leaves tier-1 pinnacle copy untouched (no knockout tier there)", () => {
    const subtitle = buildSeasonEndSubtitle({
      leagueName: "Intergalactic Elite", newLeagueName: "Intergalactic Elite", fromTier: 1,
      position: 1, type: "stayed", isInvincible: false, prestigeLevel: 2,
    });
    expect(subtitle).toBe("Champions of Intergalactic Elite! A wormhole opens beyond the pyramid...");
  });
});
