import { describe, it, expect } from "vitest";
import { collidesWithPlayerName, initLeague, initLeagueRosters, normalizeRosters, processSeasonSwaps } from "../league.js";
import { LEAGUE_DEFS, NUM_TIERS, RESERVE_TEAM_CONFIGS } from "../../data/leagues.js";

// "Red Lion FC" is a real AI team in the tier-11 defs — the exact collision
// a player triggers by picking that name for their own club. "Eastfield"
// covers the same collision in a non-starting tier (tier 10).
const TAKEN_NAME = "Red Lion FC";
const TAKEN_NAME_TIER10 = "Eastfield";
const TARGET = 10;

const RESERVE_NAMES = RESERVE_TEAM_CONFIGS.map(c => c.name);
const dummySquad = [{ id: "p1", name: "Test Player", position: "ST", attrs: {} }];

function allRosterNames(rosters) {
  const names = [];
  for (let t = 1; t <= NUM_TIERS; t++) (rosters[t] || []).forEach(r => names.push(r.name));
  return names;
}

function expectFullTiers(rosters) {
  for (let t = 1; t <= NUM_TIERS; t++) expect(rosters[t]).toHaveLength(TARGET);
}

describe("collidesWithPlayerName", () => {
  it("matches case-insensitively and ignores surrounding whitespace", () => {
    expect(collidesWithPlayerName("Red Lion FC", "red lion fc")).toBe(true);
    expect(collidesWithPlayerName("Red Lion FC", "  Red Lion FC  ")).toBe(true);
    expect(collidesWithPlayerName("Red Lion FC", "Blue Lion FC")).toBe(false);
  });

  it("never matches when either name is missing", () => {
    expect(collidesWithPlayerName("Red Lion FC", null)).toBe(false);
    expect(collidesWithPlayerName(null, "Red Lion FC")).toBe(false);
    expect(collidesWithPlayerName("Red Lion FC", "")).toBe(false);
  });
});

describe("roster fill — every tier reaches 10 AI teams", () => {
  it("with no player name (defs alone are one name short)", () => {
    expectFullTiers(initLeagueRosters());
  });

  it("with a tier-11 collision", () => {
    const rosters = initLeagueRosters(TAKEN_NAME);
    expect(allRosterNames(rosters)).not.toContain(TAKEN_NAME);
    expectFullTiers(rosters);
  });

  it("with a non-tier-11 collision", () => {
    const rosters = initLeagueRosters(TAKEN_NAME_TIER10);
    expect(allRosterNames(rosters)).not.toContain(TAKEN_NAME_TIER10);
    expectFullTiers(rosters);
  });

  it("after season-end swaps with a colliding player name", () => {
    const rosters = initLeagueRosters();
    const { rosters: newRosters } = processSeasonSwaps(rosters, null, 11, null, TAKEN_NAME);
    expect(allRosterNames(newRosters)).not.toContain(TAKEN_NAME);
    expectFullTiers(newRosters);
  });

  it("after season-end swaps with no player name", () => {
    const { rosters: newRosters } = processSeasonSwaps(initLeagueRosters(), null, 11, null);
    expectFullTiers(newRosters);
  });
});

describe("collision renaming", () => {
  it("gives the renamed team a reserve name and keeps its identity", () => {
    const rosters = initLeagueRosters(TAKEN_NAME);
    const original = LEAGUE_DEFS[11].teams.find(c => c.name === TAKEN_NAME);
    // The renamed club keeps Red Lion FC's colours/strength/trait — pick it
    // out by identity, since reserve-named backfill teams also live here.
    const renamed = rosters[11].find(r =>
      RESERVE_NAMES.includes(r.name) && r.strength === original.strength && r.color === original.color
    );
    expect(renamed).toBeDefined();
    expect(renamed.trait).toBe(original.trait);
  });

  it("renames in existing rosters without changing tier sizes", () => {
    const rosters = initLeagueRosters();
    expect(allRosterNames(rosters)).toContain(TAKEN_NAME);
    normalizeRosters(rosters, TAKEN_NAME);
    expect(allRosterNames(rosters)).not.toContain(TAKEN_NAME);
    expectFullTiers(rosters);
  });

  it("never backfills the player's name from the defs", () => {
    const rosters = initLeagueRosters();
    // Empty a tier so the deficit fill has to scan every def, including the
    // colliding one.
    rosters[11] = [];
    normalizeRosters(rosters, TAKEN_NAME);
    expect(allRosterNames(rosters)).not.toContain(TAKEN_NAME);
    expectFullTiers(rosters);
  });
});

describe("initLeague with a colliding player name", () => {
  it("fields exactly one team with the player's name — the player", () => {
    const rosters = initLeagueRosters(TAKEN_NAME);
    const league = initLeague(dummySquad, TAKEN_NAME, 11, rosters, null, 0);
    const matches = league.teams.filter(t => t.name === TAKEN_NAME);
    expect(matches).toHaveLength(1);
    expect(matches[0].isPlayer).toBe(true);
    expect(league.teams).toHaveLength(10);
  });

  it("evicts the collision case-insensitively", () => {
    const rosters = initLeagueRosters("red lion fc");
    const league = initLeague(dummySquad, "red lion fc", 11, rosters, null, 0);
    const lower = league.teams.filter(t => t.name.toLowerCase() === "red lion fc");
    expect(lower).toHaveLength(1);
    expect(lower[0].isPlayer).toBe(true);
    expect(league.teams).toHaveLength(10);
  });

  it("renames the collision even when a pre-guard roster still carries it", () => {
    // Rosters built with no player name — tier 11 still contains Red Lion FC,
    // like a save created before this guard existed.
    const legacyRosters = initLeagueRosters();
    expect(legacyRosters[11].map(r => r.name)).toContain(TAKEN_NAME);
    const league = initLeague(dummySquad, TAKEN_NAME, 11, legacyRosters, null, 0);
    const matches = league.teams.filter(t => t.name === TAKEN_NAME);
    expect(matches).toHaveLength(1);
    expect(matches[0].isPlayer).toBe(true);
    expect(league.teams).toHaveLength(10);
  });
});

describe("initLeague without a collision", () => {
  it("leaves the normal tier line-up untouched", () => {
    const rosters = initLeagueRosters("Calo's XI");
    const league = initLeague(dummySquad, "Calo's XI", 11, rosters, null, 0);
    expect(league.teams).toHaveLength(10);
    const defNames = LEAGUE_DEFS[11].teams.map(t => t.name);
    const aiNames = league.teams.filter(t => !t.isPlayer).map(t => t.name);
    aiNames.forEach(n => expect(defNames).toContain(n));
  });
});
