import { describe, it, expect } from "vitest";
import {
  migrateSquadBackfill, resolveMigratedTier, syncLeagueTierAndNames,
  migrateLegacyRosterKeys, ensureAllTierRosters, repairLeagueV2ToV3,
  migratePlayerRatingTracker, migrateClubHistoryNames, backfillClubHistory,
  resolveSeasonCalendar, migrateSeasonLeagueStatsByTier, resolveSeasonLeagueStatsAvailable,
  resolveCupStatsAvailable, migrateSummerPhase, migrateSummerWeeksForAwards, stripCupNamePrefix,
  migrateStoryArcsCompletion, backfillOvrHistorySnapshot, mergeIdentityCrisisIntoOutOfPos,
} from "../saveMigrations.js";
import { initLeagueRosters } from "../league.js";
import { LEAGUE_DEFS, NUM_TIERS } from "../../data/leagues.js";

const player = (id, name, extra = {}) => ({ id, name, position: "CM", age: 25, attrs: {}, ...extra });

describe("migrateSquadBackfill", () => {
  it("backfills nationality, statProgress, and potential when missing", () => {
    const squad = [player("a", "Kai Mori", { age: 20 })];
    const out = migrateSquadBackfill(squad, 0);
    expect(out[0].nationality).toBeTruthy();
    expect(out[0].statProgress).toEqual({});
    expect(out[0].potential).toBeGreaterThanOrEqual(0);
  });

  it("leaves existing nationality/statProgress/potential untouched", () => {
    const squad = [player("a", "Kai Mori", { nationality: "JP", statProgress: { pace: 2 }, potential: 15 })];
    const out = migrateSquadBackfill(squad, 0);
    expect(out[0].nationality).toBe("JP");
    expect(out[0].statProgress).toEqual({ pace: 2 });
    expect(out[0].potential).toBe(15);
  });

  it("repairs duplicate names", () => {
    const squad = [player("a", "Same Name"), player("b", "Same Name")];
    const out = migrateSquadBackfill(squad, 0);
    expect(out[0].name).toBe("Same Name");
    expect(out[1].name).toBe("Same Name II");
  });

  it("handles an empty/missing squad", () => {
    expect(migrateSquadBackfill(null, 0)).toEqual([]);
    expect(migrateSquadBackfill([], 0)).toEqual([]);
  });
});

describe("tier remap (resolveMigratedTier / syncLeagueTierAndNames)", () => {
  it("remaps legacy tiers 1/2/3 to 5/6/7 when there's no leagueVersion", () => {
    expect(resolveMigratedTier(1, undefined)).toBe(5);
    expect(resolveMigratedTier(2, undefined)).toBe(6);
    expect(resolveMigratedTier(3, undefined)).toBe(7);
  });

  it("leaves the tier alone once a leagueVersion is present", () => {
    expect(resolveMigratedTier(1, 3)).toBe(1);
    expect(resolveMigratedTier(2, 2)).toBe(2);
  });

  it("defaults a missing leagueTier to NUM_TIERS", () => {
    expect(resolveMigratedTier(null, undefined)).toBe(NUM_TIERS);
  });

  it("syncs league.tier and refreshes leagueName/leagueColor from LEAGUE_DEFS", () => {
    const league = { tier: 1, leagueName: "Old Name", leagueColor: "#000" };
    syncLeagueTierAndNames(league, 5);
    expect(league.tier).toBe(5);
    expect(league.leagueName).toBe(LEAGUE_DEFS[5].name);
    expect(league.leagueColor).toBe(LEAGUE_DEFS[5].color);
  });

  it("no-ops on a missing league", () => {
    expect(syncLeagueTierAndNames(null, 5)).toBe(null);
  });
});

describe("migrateLegacyRosterKeys / ensureAllTierRosters", () => {
  it("migrates old keys {1,2,3} to {5,6,7} and fills every other tier with defaults", () => {
    const old = { 1: [{ name: "Old Div1 Team" }], 2: [{ name: "Old Div2 Team" }] };
    const migrated = migrateLegacyRosterKeys(old, undefined);
    expect(migrated[5]).toEqual(old[1]);
    expect(migrated[6]).toEqual(old[2]);
    for (let t = 1; t <= NUM_TIERS; t++) expect(migrated[t]).toBeTruthy();
  });

  it("does nothing when leagueVersion is already set", () => {
    const old = { 1: [{ name: "Old Div1 Team" }] };
    expect(migrateLegacyRosterKeys(old, 3)).toBe(old);
  });

  it("does nothing when rosters are already keyed at 5", () => {
    const rosters = { 5: [{ name: "Team" }] };
    expect(migrateLegacyRosterKeys(rosters, undefined)).toBe(rosters);
  });

  it("ensureAllTierRosters fills any tier missing its roster with LEAGUE_DEFS defaults", () => {
    const rosters = { 5: [{ name: "Custom Team" }] };
    const out = ensureAllTierRosters(rosters);
    expect(out[5]).toEqual([{ name: "Custom Team" }]);
    expect(out[1].length).toBeGreaterThan(0);
  });
});

describe("repairLeagueV2ToV3", () => {
  it("no-ops for a save that's already V3 (or newer) with no legacy rosters", () => {
    const s = { leagueVersion: 3, leagueRosters: null };
    repairLeagueV2ToV3(s, []);
    expect(s.leagueVersion).toBe(3);
    expect(s.league).toBeUndefined();
  });

  it("rebuilds a non-played tier's roster when more than half its teams are non-default", () => {
    const rosters = initLeagueRosters("Red Lion FC");
    // Corrupt tier 1 (not one of the "played" tiers 5/6/7) with mostly custom names.
    rosters[1] = rosters[1].map((c, i) => i < 8 ? { ...c, name: `Custom Team ${i}` } : c);
    const s = { leagueVersion: 2, leagueRosters: rosters, league: { tier: 5 }, leagueTier: 5, teamName: "Red Lion FC", prestigeLevel: 0 };
    repairLeagueV2ToV3(s, []);
    const defaultNames = new Set((LEAGUE_DEFS[1]?.teams || []).map(t => t.name));
    const intact = s.leagueRosters[1].filter(t => defaultNames.has(t.name)).length;
    expect(intact).toBe(LEAGUE_DEFS[1].teams.length);
    expect(s.leagueVersion).toBe(3);
  });

  it("leaves an intact non-played tier roster alone", () => {
    const rosters = initLeagueRosters("Red Lion FC");
    const untouchedTier1 = rosters[1];
    const s = { leagueVersion: 2, leagueRosters: rosters, league: { tier: 5 }, leagueTier: 5, teamName: "Red Lion FC", prestigeLevel: 0 };
    repairLeagueV2ToV3(s, []);
    expect(s.leagueRosters[1]).toBe(untouchedTier1);
  });

  it("re-initializes the league/cup and resets the calendar when the save's tier is below 4", () => {
    const rosters = initLeagueRosters("Red Lion FC");
    const s = {
      leagueVersion: 2, leagueRosters: rosters, league: { tier: 2 }, leagueTier: 2,
      teamName: "Red Lion FC", prestigeLevel: 0,
      seasonCalendar: ["old"], calendarIndex: 5, calendarResults: { a: 1 }, leagueResults: { b: 1 },
    };
    repairLeagueV2ToV3(s, []);
    expect(s.leagueTier).toBe(4);
    expect(s.league.tier).toBe(4);
    expect(s.cup).toBeTruthy();
    expect(s.seasonCalendar).toBeNull();
    expect(s.calendarIndex).toBe(0);
    expect(s.calendarResults).toEqual({});
    expect(s.leagueResults).toEqual({});
    expect(s.leagueVersion).toBe(3);
  });
});

describe("migratePlayerRatingTracker", () => {
  it("rekeys a name-keyed tracker to player ids", () => {
    const tracker = { "Kai Mori": [7, 8] };
    const squad = [player("p1", "Kai Mori")];
    expect(migratePlayerRatingTracker(tracker, squad)).toEqual({ p1: [7, 8] });
  });

  it("leaves an already id-keyed tracker unchanged", () => {
    const squad = [player("p1", "Kai Mori")];
    const tracker = { p1: [7, 8] };
    expect(migratePlayerRatingTracker(tracker, squad)).toBe(tracker);
  });

  it("returns an empty tracker unchanged", () => {
    expect(migratePlayerRatingTracker({}, [])).toEqual({});
    expect(migratePlayerRatingTracker(null, [])).toEqual({});
  });

  it("drops entries for names no longer in the squad", () => {
    const tracker = { "Gone Player": [1], "Kai Mori": [2] };
    const squad = [player("p1", "Kai Mori")];
    expect(migratePlayerRatingTracker(tracker, squad)).toEqual({ p1: [2] });
  });
});

describe("clubHistory migration/backfill", () => {
  it("migrateClubHistoryNames refreshes league names and strips the cup 'The ' prefix", () => {
    const clubHistory = {
      bestSeasonFinish: { tier: 5 },
      seasonArchive: [{ tier: 5, leagueName: "Old" }],
      cupHistory: [{ cupName: "The Sub Money Cup" }, { cupName: "Clubman Cup" }],
    };
    const out = migrateClubHistoryNames(clubHistory);
    expect(out.bestSeasonFinish.leagueName).toBe(LEAGUE_DEFS[5].name);
    expect(out.seasonArchive[0].leagueName).toBe(LEAGUE_DEFS[5].name);
    expect(out.cupHistory[0].cupName).toBe("Sub Money Cup");
    expect(out.cupHistory[1].cupName).toBe("Clubman Cup");
  });

  it("migrateClubHistoryNames no-ops on a missing clubHistory", () => {
    expect(migrateClubHistoryNames(null)).toBe(null);
  });

  it("backfillClubHistory estimates career totals from available aggregate fields", () => {
    const s = {
      seasonNumber: 3, totalMatches: 20, seasonGoalsFor: 10,
      consecutiveWins: 2, consecutiveUnbeaten: 4, consecutiveLosses: 1,
      league: {
        teams: [{ isPlayer: true }, { isPlayer: false }],
        table: [{ teamIndex: 0, won: 5, drawn: 2, lost: 1, goalsFor: 12, goalsAgainst: 6 }],
      },
      playerSeasonStats: { "Kai Mori": { goals: 3, apps: 8, motm: 1, yellows: 1, reds: 0 } },
      leagueTier: 5, lastSeasonMove: "promoted",
    };
    const h = backfillClubHistory(s);
    expect(h.totalWins).toBeGreaterThanOrEqual(5);
    expect(h.totalDraws).toBeGreaterThanOrEqual(2);
    expect(h.playerCareers["Kai Mori"].goals).toBe(9); // 3 goals * seasonNumber(3)
    expect(h.seasonArchive.length).toBe(2); // seasons 1 and 2 (seasonNumber is 3)
    expect(h.seasonArchive[1].result).toBe("promoted");
  });
});

describe("resolveSeasonCalendar", () => {
  it("reuses the save's own calendar when present", () => {
    const s = { seasonCalendar: ["mw1", "mw2"], calendarIndex: 1 };
    expect(resolveSeasonCalendar(s, 5)).toEqual({ seasonCalendar: ["mw1", "mw2"], calendarIndex: 1 });
  });

  it("defaults calendarIndex to 0 when the save's calendar has no index", () => {
    const s = { seasonCalendar: ["mw1"] };
    expect(resolveSeasonCalendar(s, 5)).toEqual({ seasonCalendar: ["mw1"], calendarIndex: 0 });
  });

  it("rebuilds a calendar from league.fixtures when no calendar is saved", () => {
    const s = { seasonCalendar: null, league: { fixtures: new Array(9).fill([]) }, cup: null, matchweekIndex: 0 };
    const res = resolveSeasonCalendar(s, 5);
    expect(res).toBeTruthy();
    expect(Array.isArray(res.seasonCalendar)).toBe(true);
    expect(typeof res.calendarIndex).toBe("number");
  });

  it("returns null (do nothing) when neither a calendar nor fixtures exist", () => {
    expect(resolveSeasonCalendar({ seasonCalendar: null, league: null }, 5)).toBeNull();
  });
});

describe("season/cup stats migration", () => {
  it("migrateSeasonLeagueStatsByTier passes through an already tier-keyed blob", () => {
    const s = { seasonLeagueStatsByTier: { 5: { players: {} } } };
    expect(migrateSeasonLeagueStatsByTier(s)).toBe(s.seasonLeagueStatsByTier);
  });

  it("migrateSeasonLeagueStatsByTier migrates a single legacy blob under leagueTier", () => {
    const s = { seasonLeagueStats: { players: { p1: {} } }, leagueTier: 6 };
    expect(migrateSeasonLeagueStatsByTier(s)).toEqual({ 6: { players: { p1: {} } } });
  });

  it("migrateSeasonLeagueStatsByTier returns {} for a save with no stats at all", () => {
    expect(migrateSeasonLeagueStatsByTier({})).toEqual({});
  });

  it("resolveSeasonLeagueStatsAvailable trusts an explicit flag first", () => {
    expect(resolveSeasonLeagueStatsAvailable({ seasonLeagueStatsAvailable: false, matchweekIndex: 5 }, { 5: {} })).toBe(false);
  });

  it("resolveSeasonLeagueStatsAvailable is available when there's tier data or the season hasn't progressed", () => {
    expect(resolveSeasonLeagueStatsAvailable({ matchweekIndex: 0 }, {})).toBe(true);
    expect(resolveSeasonLeagueStatsAvailable({ matchweekIndex: 5 }, { 5: {} })).toBe(true);
    expect(resolveSeasonLeagueStatsAvailable({ matchweekIndex: 5 }, {})).toBe(false);
  });

  it("resolveCupStatsAvailable mirrors the same legacy-detection shape for cups", () => {
    expect(resolveCupStatsAvailable({ cup: null }, {})).toBe(true);
    expect(resolveCupStatsAvailable({ cup: { currentRound: 2 } }, {})).toBe(false);
    expect(resolveCupStatsAvailable({ cup: { currentRound: 2 } }, { clubman: {} })).toBe(true);
    expect(resolveCupStatsAvailable({ seasonCupStatsAvailable: true, cup: { currentRound: 2 } }, {})).toBe(true);
  });
});

describe("migrateSummerPhase", () => {
  it("converts the retired 'summary' phase to 'break' and seeds weeksLeft", () => {
    expect(migrateSummerPhase("summary", { foo: 1 })).toEqual({ phase: "break", data: { foo: 1, weeksLeft: 5 } });
  });

  it("preserves an explicit weeksLeft on a 'summary' phase", () => {
    expect(migrateSummerPhase("summary", { weeksLeft: 2 })).toEqual({ phase: "break", data: { weeksLeft: 2 } });
  });

  it("passes through any other phase unchanged", () => {
    expect(migrateSummerPhase("break", { weeksLeft: 3 })).toEqual({ phase: "break", data: { weeksLeft: 3 } });
    expect(migrateSummerPhase(null, null)).toEqual({ phase: null, data: null });
  });
});

describe("stripCupNamePrefix", () => {
  it("strips a leading 'The '", () => {
    expect(stripCupNamePrefix({ cupName: "The Clubman Cup" }).cupName).toBe("Clubman Cup");
  });

  it("leaves names without the prefix alone", () => {
    expect(stripCupNamePrefix({ cupName: "Clubman Cup" }).cupName).toBe("Clubman Cup");
  });

  it("handles a missing cup", () => {
    expect(stripCupNamePrefix(null)).toBe(null);
  });
});

describe("migrateStoryArcsCompletion", () => {
  it("reconstructs completed arcs from inbox 'Arc Complete:' messages", () => {
    const storyArcs = { player: null, club: null, legacy: null };
    const inboxMessages = [{ title: "Arc Complete: Captain Fantastic" }];
    const out = migrateStoryArcsCompletion(storyArcs, inboxMessages);
    expect(out._arcRewardV3).toBe(true);
    expect(out.completed).toContain("captain_fantastic");
    expect(out.rewardsApplied).toEqual([]);
  });

  it("also captures arcs marked completed in tracking but missing from inbox", () => {
    const storyArcs = { player: { completed: true, arcId: "captain_fantastic" }, club: null, legacy: null };
    const out = migrateStoryArcsCompletion(storyArcs, []);
    expect(out.completed).toContain("captain_fantastic");
  });

  it("no-ops once already migrated (_arcRewardV3 set)", () => {
    const storyArcs = { _arcRewardV3: true, completed: ["x"] };
    expect(migrateStoryArcsCompletion(storyArcs, [{ title: "Arc Complete: Captain Fantastic" }])).toBe(storyArcs);
    expect(storyArcs.completed).toEqual(["x"]);
  });
});

describe("backfillOvrHistorySnapshot", () => {
  it("builds a single-entry snapshot keyed by name|position", () => {
    const squad = [{ name: "Kai Mori", position: "CM", attrs: {} }];
    const out = backfillOvrHistorySnapshot(squad, 3, 2);
    expect(out).toHaveLength(1);
    expect(out[0].w).toBe(4);
    expect(out[0].s).toBe(2);
    expect(Object.keys(out[0].p)).toEqual(["Kai Mori|CM"]);
  });

  it("defaults week/season when missing", () => {
    const out = backfillOvrHistorySnapshot([], null, null);
    expect(out[0].w).toBe(1);
    expect(out[0].s).toBe(1);
  });
});

// The summer break grew 5 → 6 beats when Awards Night was inserted (save v3).
describe("migrateSummerWeeksForAwards", () => {
  it("shifts a v2 mid-summer save's weeksLeft up past the new beat", () => {
    expect(migrateSummerWeeksForAwards(2, "break", { weeksLeft: 3 }).weeksLeft).toBe(4);
    expect(migrateSummerWeeksForAwards(2, "break", { weeksLeft: 5 }).weeksLeft).toBe(6);
  });

  it("leaves youth-intake and preview weeks (below the insertion point) alone", () => {
    expect(migrateSummerWeeksForAwards(2, "break", { weeksLeft: 2 }).weeksLeft).toBe(2);
    expect(migrateSummerWeeksForAwards(2, "break", { weeksLeft: 1 }).weeksLeft).toBe(1);
  });

  it("does not touch v3+ saves, non-summer saves, or absent summer data", () => {
    expect(migrateSummerWeeksForAwards(3, "break", { weeksLeft: 3 }).weeksLeft).toBe(3);
    expect(migrateSummerWeeksForAwards(2, null, { weeksLeft: 3 }).weeksLeft).toBe(3);
    expect(migrateSummerWeeksForAwards(2, "break", null)).toBe(null);
  });
});

// He Doesn't Even Go Here absorbed the former Identity Crisis card (same id
// throughout the merge: out_of_pos). A save with identity_crisis already
// unlocked must come out with out_of_pos unlocked and identity_crisis gone.
describe("mergeIdentityCrisisIntoOutOfPos", () => {
  it("remaps identity_crisis to out_of_pos, dropping the stale id", () => {
    const result = mergeIdentityCrisisIntoOutOfPos(new Set(["first_win", "identity_crisis", "clean_sheet"]));
    expect(result.has("identity_crisis")).toBe(false);
    expect(result.has("out_of_pos")).toBe(true);
    expect(result.has("first_win")).toBe(true);
    expect(result.has("clean_sheet")).toBe(true);
  });

  it("is a no-op (same reference) when identity_crisis isn't present", () => {
    const prev = new Set(["first_win", "out_of_pos"]);
    const result = mergeIdentityCrisisIntoOutOfPos(prev);
    expect(result).toBe(prev);
  });

  it("does not duplicate out_of_pos if both ids were somehow already present", () => {
    const result = mergeIdentityCrisisIntoOutOfPos(new Set(["identity_crisis", "out_of_pos"]));
    expect(result.has("identity_crisis")).toBe(false);
    expect([...result].filter(id => id === "out_of_pos")).toHaveLength(1);
  });

  it("handles a missing/undefined set without throwing", () => {
    expect(mergeIdentityCrisisIntoOutOfPos(null)).toBe(null);
    expect(mergeIdentityCrisisIntoOutOfPos(undefined)).toBe(undefined);
  });
});
