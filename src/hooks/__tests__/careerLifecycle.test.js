import { beforeEach, it, expect, vi } from "vitest";
vi.mock("react", async original => ({ ...await original(), useCallback: fn => fn, useRef: value => ({ current: value }) }));
import { useGameStore } from "../../store/gameStore.js";
import { useGainPopupHandler } from "../useGainPopupHandler.js";
import { useSeasonEnd } from "../useSeasonEnd.js";
import { generateSquad } from "../../utils/player.js";
import { initLeague, initLeagueRosters, initCup, buildSeasonCalendar } from "../../utils/league.js";

beforeEach(() => {
  const squad = generateSquad();
  const leagueRosters = initLeagueRosters("Test FC");
  const league = initLeague(squad, "Test FC", 11, leagueRosters);
  const cup = initCup("Test FC", 11, leagueRosters);
  useGameStore.setState({ ...useGameStore.getInitialState(), teamName: "Test FC", squad, league, leagueRosters, cup, seasonCalendar: buildSeasonCalendar(league.fixtures.length, cup, 11), startingXI: squad.slice(0, 11).map(p => p.id), bench: squad.slice(11, 16).map(p => p.id) });
});
const seasonActions = () => useSeasonEnd({ tryUnlockAchievement: vi.fn(), setMatchResult: useGameStore.getState().setMatchResult, setCupMatchResult: useGameStore.getState().setCupMatchResult });

it("starts an isolated career without erasing the profile or carrying over pending work", () => {
  useGameStore.setState({ activeProfileId: "profile", careerId: "old", totalMatches: 99, pendingLeague: { old: true }, pendingTrialAction: { type: "continue" }, cardedPlayerIds: new Set(["old"]), summerPhase: "prestige", clubHistory: { totalWins: 50 } });
  const squad = generateSquad();
  useGameStore.getState().startNewCareer(squad);
  const next = useGameStore.getState();
  expect(next.activeProfileId).toBe("profile");
  expect(next.careerId).toBeNull(); expect(next.squad).toBe(squad);
  expect(next.totalMatches).toBe(0); expect(next.pendingLeague).toBeNull();
  expect(next.pendingTrialAction).toBeNull(); expect(next.cardedPlayerIds.size).toBe(0);
  expect(next.summerPhase).toBeNull(); expect(next.clubHistory).toEqual(useGameStore.getInitialState().clubHistory);
  expect(next.clubHistory).not.toBe(useGameStore.getInitialState().clubHistory);
});

it("ignores season callbacks outside their authoritative phase", () => {
  const a = seasonActions(); const initial = useGameStore.getState();
  a.onSeasonEndRevealDone(); a.onPrestigeDone(); a.onLegendSelectionDone([]); a.onYouthIntakeDone([]);
  expect(useGameStore.getState()).toBe(initial);
});
it("consumes a season reveal once, retaining its generated youth choices", () => {
  useGameStore.setState({ summerPhase: "summary", summerData: { fromTier: 11, toTier: 11, position: 6, moveType: "stayed" } });
  const a = seasonActions(); a.onSeasonEndRevealDone();
  const after = useGameStore.getState();
  expect(after.summerPhase).toBe("break");
  expect(after.summerData.youthCandidates.length).toBeGreaterThan(0);
  a.onSeasonEndRevealDone(); expect(useGameStore.getState()).toBe(after);
});
it("settles an already-rolled training squad only once", () => {
  const s = useGameStore.getState();
  const next = s.squad.map((p, i) => i ? p : { ...p, attrs: { ...p.attrs, pace: p.attrs.pace + 1 } });
  s.setGains({ improvements: [], injuries: [] });
  const originalReport = useGameStore.getState().gains;
  s.setGains({ ...originalReport, revealedItems: ["gain:0"] });
  useGameStore.setState({ pendingSquad: next, pendingTrialAction: null });
  const { processGainsDone } = useGainPopupHandler({ setGains: s.setGains, setOvrLevelUps: vi.fn(), setRecentOvrLevelUps: vi.fn(), setInjuryWarning: vi.fn(), tryUnlockAchievement: vi.fn() });
  processGainsDone(originalReport);
  const after = useGameStore.getState();
  expect(after.squad[0].attrs.pace).toBe(next[0].attrs.pace);
  expect(after.gains).toBeNull(); expect(after.pendingSquad).toBeNull();
  processGainsDone(originalReport); expect(useGameStore.getState()).toBe(after);
});

it("rolls an intake into the next season only once", () => {
  const s = useGameStore.getState();
  useGameStore.setState({ summerPhase: "intake", summerData: { fromTier: 11, toTier: 11, position: 6, moveType: "stayed", preRetirementSquad: s.squad } });
  const a = seasonActions();
  a.onYouthIntakeDone([]);
  const after = useGameStore.getState();
  expect(after.seasonNumber).toBe(s.seasonNumber + 1);
  expect(after.clubHistory.seasonArchive).toHaveLength(1);
  a.onYouthIntakeDone([]);
  expect(useGameStore.getState()).toBe(after);
});

it("applies a prestige reset only once", () => {
  const s = useGameStore.getState();
  useGameStore.setState({ summerPhase: "legendSelect" });
  const a = seasonActions();
  a.onLegendSelectionDone([]);
  const after = useGameStore.getState();
  expect(after.prestigeLevel).toBe(s.prestigeLevel + 1);
  expect(after.seasonNumber).toBe(s.seasonNumber + 1);
  a.onLegendSelectionDone([]);
  expect(useGameStore.getState()).toBe(after);
});
