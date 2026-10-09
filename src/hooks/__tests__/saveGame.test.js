import "fake-indexeddb/auto";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
vi.mock("react", async importOriginal => ({ ...await importOriginal(), useCallback: fn => fn, useRef: value => ({ current: value }) }));
import { useSaveGame } from "../useSaveGame.js";
import { useGameStore } from "../../store/gameStore.js";
import { storage } from "../../persistence/storage.js";
import { generateSquad } from "../../utils/player.js";
import { initLeague, initLeagueRosters, buildSeasonCalendar, initCup, getLeagueMatchdaysPlayed } from "../../utils/league.js";
import { createSavePayload, validateSavePayload } from "../../persistence/savePayload.js";
import { getSaveKey, profileKey } from "../../persistence/keys.js";
import { unlockAchievementToProfile } from "../../utils/profile.js";

let callbacks;
function game() {
  const squad = generateSquad();
  const rosters = initLeagueRosters("Test FC");
  const league = initLeague(squad, "Test FC", 11, rosters);
  const cup = initCup("Test FC", 11, rosters);
  useGameStore.setState({ ...useGameStore.getInitialState(), activeProfileId: "test", careerId: "career-test", teamName: "Test FC", squad, startingXI: squad.slice(0,11).map(p=>p.id), bench: squad.slice(11,16).map(p=>p.id), league, leagueTier: 11, leagueRosters: rosters, cup, seasonCalendar: buildSeasonCalendar(league.fixtures.length,cup,11), gameMode: "ironman" });
  callbacks = { activeSaveSlot: 1, setSaveStatus: vi.fn(), setArchiveStatus: vi.fn(), setActiveSaveSlot: vi.fn(), setSaveSlotSummaries: vi.fn(), setImportStatus: vi.fn(), setPendingPlayerUnlock: vi.fn(), loadSettings: vi.fn(), generateNewspaperName: () => "Test Gazette", generateReporterName: () => "Reporter", achievementUnlockWeeksRef: { current: {} } };
  return useSaveGame(callbacks);
}
beforeEach(async () => { await storage._db.kv.clear(); await storage._db.backups.clear(); });
afterEach(() => vi.restoreAllMocks());

describe("actual career save/load boundary", () => {
  it.each([
    { totalWins: 0, totalLosses: 1, totalGoalsConceded: 2, worstDefeat: { score: "0-2" } },
    { totalWins: 0, totalDraws: 4 },
    { totalWins: 12, totalLosses: 0, totalGoalsFor: 35 },
    { totalWins: 0, cupHistory: [{ cupName: "Cup", season: 1 }] },
  ])("preserves exact history across reload: %j", async record => {
    const actions = game();
    const history = { ...useGameStore.getState().clubHistory, ...record };
    useGameStore.setState({ clubHistory: history, calendarIndex: 4 });
    expect(await actions.saveGame()).toBe(true);
    useGameStore.setState({ clubHistory: { totalWins: 999 }, squad: [], league: null });
    expect(await actions.loadGame()).toBe(true);
    expect(useGameStore.getState().clubHistory).toEqual(history);
    const s = useGameStore.getState();
    expect(s.matchweekIndex).toBe(getLeagueMatchdaysPlayed(s.seasonCalendar,4));
  });
  it("publishes a load once, without exposing intermediate state", async () => {
    const actions = game(); await actions.saveGame();
    const states=[]; const stop=useGameStore.subscribe(s=>states.push(s));
    expect(await actions.loadGame()).toBe(true); stop();
    expect(states).toHaveLength(1);
    expect(states[0].squad.length).toBeGreaterThan(10);
  });
  it.each(["summary", "prestige", "legendSelect", "intake"])("resumes the unconsumed %s season phase", async phase => {
    const actions = game();
    const data = { fromTier: 11, toTier: 10, position: 1, weeksLeft: 5, youthCandidates: [] };
    useGameStore.setState({ summerPhase: phase, summerData: data });
    await actions.saveGame();
    useGameStore.setState({ summerPhase: null, summerData: null });
    expect(await actions.loadGame()).toBe(true);
    expect(useGameStore.getState().summerPhase).toBe(phase);
    expect(useGameStore.getState().summerData).toEqual(data);
  });
  it("round-trips deferred training, claimed rewards, disciplinary and trial state", async () => {
    const actions = game();
    const s = useGameStore.getState();
    s.setGains({ improvements: [], injuries: [], revealedItems: ["gain:0"], pickedTickets: { "capped_arc_ticket:1": "rewind" } });
    useGameStore.setState({ pendingSquad: s.squad, cardedPlayerIds: new Set([s.squad[0].id]), weekRecoveries: [{ playerName: s.squad[0].name }], pendingTrialAction: { type: "continue", id: "trial", newWeeksLeft: 1, newStarts: 2 }, matchPending: true });
    const before = createSavePayload(useGameStore.getState(), 0);
    await actions.saveGame();
    useGameStore.setState({ gains: null, pendingSquad: null, pendingTrialAction: null, matchPending: false });
    expect(await actions.loadGame()).toBe(true);
    const after = createSavePayload(useGameStore.getState(), 0);
    for (const key of ["gains", "pendingSquad", "pendingTrialAction", "weekRecoveries", "cardedPlayerIds", "matchPending"]) expect(after[key]).toEqual(before[key]);
  });
  it.each(["matchResult", "cupMatchResult"])("retains the exact rolled %s and deferred standings", async field => {
    const actions = game();
    const result = { home: 0, away: 1, homeGoals: 2, awayGoals: 1, events: [], _calendarIndex: 3 };
    const table = structuredClone(useGameStore.getState().league);
    table.table[0].points = 3;
    useGameStore.setState({ [field]: result, pendingLeague: table });
    await actions.saveGame();
    useGameStore.setState({ [field]: null, pendingLeague: null });
    expect(await actions.loadGame()).toBe(true);
    expect(useGameStore.getState()[field]).toEqual(result);
    expect(useGameStore.getState().pendingLeague).toEqual(table);
  });
  it("preserves assigned formation slots and pads legacy eleven-slot arrays", async () => {
    const actions = game();
    const assignments = [...useGameStore.getState().startingXI].reverse();
    useGameStore.setState({ slotAssignments: assignments });
    expect(await actions.saveGame()).toBe(true);
    useGameStore.setState({ slotAssignments: null });
    expect(await actions.loadGame()).toBe(true);
    const restored = useGameStore.getState().slotAssignments;
    expect(restored.slice(0, 11)).toEqual(assignments);
    expect(restored.slice(11)).toEqual(Array(restored.length - 11).fill(null));
  });
  it("does not replace live state or the saved slot with an invalid import", async () => {
    const actions=game(); await actions.saveGame();
    const before=useGameStore.getState(); const disk=await storage.getSave(getSaveKey("test",1));
    await actions.importSave({ text: async()=>JSON.stringify({teamName:"Not a career"}) });
    expect(useGameStore.getState()).toBe(before);
    expect(await storage.getSave(getSaveKey("test",1))).toEqual(disk);
    expect(callbacks.setImportStatus).toHaveBeenLastCalledWith("invalid");
  });
  it("a migration failure leaves both the live state and disk unchanged", async () => {
    const actions=game(); await actions.saveGame();
    const before=useGameStore.getState(); const disk=await storage.getSave(getSaveKey("test",1));
    const malformed={...JSON.parse(disk.value),clubHistory:{seasonArchive:42}};
    await actions.importSave({text:async()=>JSON.stringify(malformed)});
    expect(useGameStore.getState()).toBe(before);
    expect(await storage.getSave(getSaveKey("test",1))).toEqual(disk);
  });
  it("returns failure rather than treating an unsuccessful write as success", async () => {
    const actions=game(); vi.spyOn(storage,"setSave").mockRejectedValue(new Error("Disk full"));
    expect(await actions.saveGame()).toBe(false);
    expect(callbacks.setSaveStatus).toHaveBeenLastCalledWith("error");
    expect(useGameStore.getState().teamName).toBe("Test FC");
  });
  it("validates payloads and accepts the real serializer",()=>{
    game(); expect(()=>validateSavePayload(createSavePayload(useGameStore.getState(),0))).not.toThrow();
    for(const patch of [{squad:[]},{startingXI:["missing"]},{version:999},{league:null}]){
      expect(()=>validateSavePayload({...createSavePayload(useGameStore.getState(),0),...patch})).toThrow();
    }
  });
  it("archives once and closes the career atomically, rejecting late saves",async()=>{
    const actions=game(); await actions.saveGame();
    await storage.set(profileKey("test"),JSON.stringify({id:"test",museum:[]}));
    const stale=(await storage.getSave(getSaveKey("test",1))).value;
    expect(await actions.triggerSacking()).toBe(true);
    expect(await actions.triggerSacking()).toBe(true);
    expect(JSON.parse((await storage.get(profileKey("test"))).value).museum).toHaveLength(1);
    expect(await storage.getSave(getSaveKey("test",1))).toBeNull();
    await expect(storage.setSave(getSaveKey("test",1),stale)).rejects.toThrow("ended");
    expect(await storage.listBackups(getSaveKey("test",1))).toEqual([]);
  });
  it("failed archival retains the old save and allows retry without duplicating history",async()=>{
    const actions=game(); await actions.saveGame();
    const old=await storage.getSave(getSaveKey("test",1));
    expect(await actions.triggerSacking()).toBe(false);
    expect(await storage.getSave(getSaveKey("test",1))).toEqual(old);
    expect(useGameStore.getState().gameOver).toBe(true);
    await storage.set(profileKey("test"),JSON.stringify({id:"test",museum:[]}));
    expect(await actions.triggerSacking()).toBe(true);
    expect(JSON.parse((await storage.get(profileKey("test"))).value).museum).toHaveLength(1);
  });

  it("can archive a loaded legacy career before its first new-format save", async () => {
    const actions = game();
    const legacy = createSavePayload(useGameStore.getState(), 0);
    delete legacy.careerId;
    legacy.version = 3;
    await storage.setSave(getSaveKey("test", 1), JSON.stringify(legacy));
    await storage.set(profileKey("test"), JSON.stringify({ id: "test", museum: [] }));
    expect(await actions.loadGame()).toBe(true);
    expect(await actions.triggerSacking()).toBe(true);
    expect(JSON.parse((await storage.get(profileKey("test"))).value).museum).toHaveLength(1);
  });

  it("recovers from a migration-invalid active save without publishing it", async () => {
    const actions = game();
    await actions.saveGame();
    const valid = JSON.parse((await storage.getSave(getSaveKey("test", 1))).value);
    await storage.setSave(getSaveKey("test", 1), JSON.stringify({ ...valid, clubHistory: { seasonArchive: 42 } }));
    const states = [];
    const stop = useGameStore.subscribe(s => states.push(s));
    expect(await actions.loadGame()).toBe(true);
    stop();
    expect(states).toHaveLength(1);
    expect(useGameStore.getState().clubHistory).toEqual(valid.clubHistory);
  });

  it("concurrent achievement updates cannot overwrite the museum archive", async () => {
    const actions = game();
    await actions.saveGame();
    await storage.set(profileKey("test"), JSON.stringify({ id: "test", museum: [], unlockedAchievements: [], achievementDates: {} }));
    const archive = actions.triggerSacking();
    const achievement = unlockAchievementToProfile("test", "example");
    expect(await archive).toBe(true);
    await achievement;
    const profile = JSON.parse((await storage.get(profileKey("test"))).value);
    expect(profile.museum).toHaveLength(1);
    expect(profile.unlockedAchievements).toEqual(["example"]);
  });
});
