import { describe, it, expect } from "vitest";
import { collidesWithPlayerName, initLeague, initLeagueRosters, normalizeRosters, processSeasonSwaps } from "../league.js";
import { LEAGUE_DEFS, NUM_TIERS, RESERVE_TEAM_NAMES } from "../../data/leagues.js";

// "Red Lion FC" is a real AI team in the tier-11 defs — the exact collision
// a player triggers by picking that name for their own club.
const TAKEN_NAME = "Red Lion FC";

const dummySquad = [{ id: "p1", name: "Test Player", position: "ST", attrs: {} }];

function allRosterNames(rosters) {
  const names = [];
  for (let t = 1; t <= NUM_TIERS; t++) (rosters[t] || []).forEach(r => names.push(r.name));
  return names;
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

describe("initLeagueRosters with a player name that exists in the defs", () => {
  it("renames the clashing AI team instead of shrinking any tier", () => {
    const baseline = initLeagueRosters();
    const rosters = initLeagueRosters(TAKEN_NAME);
    expect(allRosterNames(rosters)).not.toContain(TAKEN_NAME);
    for (let t = 1; t <= NUM_TIERS; t++) {
      expect(rosters[t]).toHaveLength(baseline[t].length);
    }
  });

  it("gives the renamed team a reserve name and keeps its identity", () => {
    const rosters = initLeagueRosters(TAKEN_NAME);
    const original = LEAGUE_DEFS[11].teams.find(c => c.name === TAKEN_NAME);
    const renamed = rosters[11].find(r => RESERVE_TEAM_NAMES.includes(r.name));
    expect(renamed).toBeDefined();
    expect(renamed.strength).toBe(original.strength);
    expect(renamed.color).toBe(original.color);
    expect(renamed.trait).toBe(original.trait);
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

describe("normalizeRosters with a colliding player name", () => {
  it("renames the collision in existing rosters without changing tier sizes", () => {
    const rosters = initLeagueRosters();
    const sizesBefore = {};
    for (let t = 1; t <= NUM_TIERS; t++) sizesBefore[t] = rosters[t].length;
    expect(allRosterNames(rosters)).toContain(TAKEN_NAME);
    normalizeRosters(rosters, TAKEN_NAME);
    expect(allRosterNames(rosters)).not.toContain(TAKEN_NAME);
    for (let t = 1; t <= NUM_TIERS; t++) expect(rosters[t]).toHaveLength(sizesBefore[t]);
  });

  it("never backfills the player's name from the defs", () => {
    const rosters = initLeagueRosters();
    // Empty a tier so the deficit fill has to scan every def, including the
    // colliding one.
    rosters[11] = [];
    normalizeRosters(rosters, TAKEN_NAME);
    expect(allRosterNames(rosters)).not.toContain(TAKEN_NAME);
  });
});

describe("processSeasonSwaps with a colliding player name", () => {
  it("keeps season-end roster rebuilds free of the player's name", () => {
    const rosters = initLeagueRosters();
    const { rosters: newRosters } = processSeasonSwaps(rosters, null, 11, null, TAKEN_NAME);
    expect(allRosterNames(newRosters)).not.toContain(TAKEN_NAME);
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
