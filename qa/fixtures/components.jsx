import React, { useState } from "react";
import { MatchResultScreen } from "../../src/components/match/MatchResultScreen.jsx";
import { BootRoom } from "../../src/components/boot/BootRoom.jsx";
import { LeaguePage } from "../../src/components/league/LeaguePage.jsx";
import { OvrProgressChart } from "../../src/components/charts/OvrCharts.jsx";
import { CupPage } from "../../src/components/cup/CupPage.jsx";
import { AchievementToast } from "../../src/components/achievements/AchievementToast.jsx";
import { CigCard } from "../../src/components/achievements/CigCard.jsx";
import { CigPacksTab } from "../../src/components/achievements/CigPacksTab.jsx";
import { CIG_PACKS } from "../../src/data/cigPacks.js";
import { ClubLegends } from "../../src/components/club/ClubLegends.jsx";
import { YouthIntakeScreen } from "../../src/components/season/YouthIntakeScreen.jsx";
import { FIXTURES as REGISTRY } from "./registry.js";

// ---------------------------------------------------------------------------
// Component fixture renderers for the visual QA harness.
//
// Fixture metadata (id/label/clickText) lives in registry.js; this file maps
// each id to a `render()` that returns the component mounted with
// deterministic mock props for one specific visual state. The harness
// (qa/harness.jsx) picks a fixture by `?c=<id>` and Playwright loops every
// fixture across desktop + mobile viewports, screenshotting each.
//
// Fixtures are hand-built, not captured — they exist to freeze the exact
// states that are painful to reach in-game (a brace, duplicate surnames, a
// specific inbox message, an empty all-time tab) so UI changes can be eyeballed
// without playing a match.
// ---------------------------------------------------------------------------

const noop = () => {};

// --- Match result ----------------------------------------------------------

function makeSquad(prefix, names) {
  return names.map(([name, position], i) => ({ id: `${prefix}${i}`, name, position }));
}

const HOME_NAMES = [
  ["Danny Vaughan", "GK"], ["Curtis Lane", "RB"], ["Marcus Webb", "CB"],
  ["Tom Ellis", "CB"], ["Ryan Poole", "LB"], ["Alfie Wilson", "CM"],
  ["Joe Marsh", "CM"], ["Nathan Robinson", "AM"], ["Sonny Reid", "RW"],
  ["Louie Adams", "ST"], ["Kai Bennett", "LW"],
];
const AWAY_NAMES = [
  ["Owen Frost", "GK"], ["Dean Cox", "RB"], ["Harry Boyd", "CB"],
  ["Sam Hale", "CB"], ["Leon Pryce", "LB"], ["Jordan Nash", "CM"],
  ["Elliot Shaw", "CM"], ["Reece Palmer", "AM"], ["Toby Grant", "RW"],
  ["Max Doherty", "ST"], ["Finn Hughes", "LW"],
];

const homeTeam = {
  name: "Red Lion FC", color: "#ef4444", isPlayer: true,
  squad: makeSquad("h", HOME_NAMES),
};
const awayTeam = {
  name: "Yeralden", color: "#38bdf8", isPlayer: false, trait: "physical",
  squad: makeSquad("a", AWAY_NAMES),
};

const table = [
  { teamIndex: 0, played: 5, won: 3, drawn: 1, lost: 1, goalsFor: 9, goalsAgainst: 5, points: 10 },
  { teamIndex: 1, played: 5, won: 2, drawn: 1, lost: 2, goalsFor: 7, goalsAgainst: 7, points: 7 },
];

const goal = (side, player, assister, minute, color) => ({
  type: "goal", side, player, assister, minute, flash: true, flashColor: color,
  text: `⚽ GOAL! ${player} scores for ${side === "home" ? "Red Lion FC" : "Yeralden"}!${assister ? ` (Assist: ${assister})` : ""}`,
});
const beat = (minute, text) => ({ type: "chance", side: "home", minute, text });

function ratings(names, base) {
  return names.map(([name, position], i) => ({
    id: `${base}${i}`, name, position, rating: 6 + ((i * 7) % 30) / 10, isSub: false,
  }));
}

function matchResult({ events, scorers, penalties = null }) {
  return {
    home: 0, away: 1, isPlayerHome: true, penalties,
    events, scorers,
    playerRatings: ratings(HOME_NAMES, "h"),
  };
}

const league = { teams: [homeTeam, awayTeam], table };

const matchProps = (result, extra = {}) => ({
  result, league, onDone: noop, onSpeedChange: noop,
  competitionLabel: "Concrete Schoolyard", matchDetail: "full",
  instantMatch: true, isOnHoliday: false, onPlayerClick: noop,
  ...extra,
});

// --- Inbox -----------------------------------------------------------------

const settingsBag = {
  matchSpeed: 1, setMatchSpeed: noop, soundEnabled: true, setSoundEnabled: noop,
  autoSaveEnabled: true, setAutoSaveEnabled: noop, trainingCardSpeed: 1, setTrainingCardSpeed: noop,
  matchDetail: "full", setMatchDetail: noop, musicEnabled: false, setMusicEnabled: noop,
  musicVolume: 0.5, setMusicVolume: noop, disabledTracks: new Set(), setDisabledTracks: noop,
  instantMatch: false, setInstantMatch: noop,
};
const saveBag = { saveGame: noop, saveStatus: null, activeSaveSlot: 1, exportSave: noop, importSave: noop, deleteSave: noop, importStatus: null };
const debugBag = { onDebugJumpTier: noop, onDebugSetSquadOvr: noop, onDebugWinLeague: noop, onDebugSetPrestige: noop };

// Live-state wrapper so choice buttons actually resolve when clicked in the
// harness (and so a "resolved" fixture can pre-seed choiceResult).
function InboxHarness({ messages }) {
  const [inboxMessages, setInboxMessages] = useState(messages);
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <BootRoom
        settings={settingsBag}
        save={saveBag}
        debug={debugBag}
        inbox={{ inboxMessages, setInboxMessages, onInboxChoice: noop, onMessageRead: noop }}
        calendar={[]}
        calendarIndex={10}
        league={league}
        cup={null}
        calendarResults={{}}
        seasonNumber={1}
        week={5}
        onExitToMenu={noop}
        storyArcs={{}}
        setStoryArcs={noop}
        squad={homeTeam.squad}
        setSquad={noop}
        leagueTier={11}
        initialTab="inbox"
        matchweekIndex={5}
        prestigeLevel={0}
        ovrCap={20}
        managerName="Walter Warnock"
      />
    </div>
  );
}

const asstTrainingMsg = (resolved) => ({
  id: "msg_asst_mgr_training_intro", seq: 0, week: 3, season: 1, read: !!resolved,
  icon: "📋", color: "#f59e0b", title: "Asst. Manager's Notes",
  body: "Boss, now that we've got a match under our belt, I wanted to have a word about training.\n\nEach week, your players can be assigned a training focus. It's how they improve over time.\n\nYou can set it up on the Squad page, or I'm happy to put everyone on a general programme for now. Your call.",
  type: "asst_mgr_training_intro", visibleFromIndex: 2,
  choices: [{ label: "You Handle It", value: "delegate" }, { label: "I'll Set It Up", value: "manual" }],
  ...(resolved ? { choiceResult: "delegate" } : {}),
});

const trialMsg = () => ({
  id: "msg_trial_x", seq: 1, week: 4, season: 1,
  icon: "🌍", color: "#4ade80", title: "Trial Suggested: Diego Sosa",
  body: 'Your scout reports: "Diego Sosa, a 19-year-old ST from Argentina 🇦🇷, is over here on holiday and showing promise. Available for a 3-week trial."',
  type: "trial_offer",
  choices: [{ label: "Accept Trial", value: "accept" }, { label: "Decline", value: "decline" }],
});

const poachMsg = () => ({
  id: "msg_poach_x", seq: 2, week: 6, season: 1,
  icon: "🎯", color: "#d4a017", title: "Poaching Opportunity",
  body: "Three players are unsettled at their clubs and open to a move. Pick one to make an approach.",
  type: "poach_event",
  choices: [
    { label: "Sign Remy Diaby", value: "0" },
    { label: "Sign Karl Voss", value: "1" },
    { label: "Sign Tunde Bello", value: "2" },
  ],
});

// --- League stats ----------------------------------------------------------

function statPlayers(rows) {
  const players = {};
  rows.forEach((r, i) => {
    const key = `p${i}`;
    players[key] = {
      key, playerId: key, name: r.name, teamId: r.teamId, teamName: r.teamName,
      position: r.position || "ST",
      goals: r.goals || 0, assists: r.assists || 0, yellows: r.yellows || 0, reds: r.reds || 0,
    };
  });
  return { players, processedMatches: {} };
}

const leagueForStats = {
  ...league,
  tier: 11,
  leagueName: "Concrete Schoolyard",
  fixtures: Array.from({ length: 18 }, () => []),
};

const midSeasonStats = statPlayers([
  { name: "Nathan Robinson", teamId: 0, teamName: "Red Lion FC", goals: 8, assists: 3, yellows: 2, reds: 0 },
  { name: "Max Doherty", teamId: 1, teamName: "Yeralden", goals: 6, assists: 1, yellows: 1, reds: 1 },
  { name: "Louie Adams", teamId: 0, teamName: "Red Lion FC", goals: 5, assists: 4, yellows: 0, reds: 0 },
  { name: "Reece Palmer", teamId: 1, teamName: "Yeralden", goals: 3, assists: 5, yellows: 3, reds: 0 },
]);

const leagueStatsProps = (extra = {}) => ({
  league: leagueForStats, leagueResults: {}, matchweekIndex: 9, teamName: "Red Lion FC",
  playerSeasonStats: {}, playerRatingTracker: {}, squad: homeTeam.squad, startingXI: [], bench: [],
  seasonNumber: 1, clubHistory: { seasonArchive: [], cupHistory: [] },
  allTimeLeagueStatsByTier: {}, allLeagueStates: {}, leagueTier: 11,
  onPlayerClick: noop, onTeamClick: noop,
  seasonLeagueStatsByTier: { 11: midSeasonStats }, seasonLeagueStatsAvailable: true,
  ...extra,
});

// --- League — knockout-tier qualification badges ----------------------------

// Tier 3 (Euro Dynasty, knockoutAtEnd) — 7 teams so the top-4 Dynasty Cup
// qualification zone (Q chips) partially overlaps the top-3 promotion zone
// (row 4 gets a Q chip with no promotion border) and the bottom-3 relegation
// zone shows independently.
const dynastyTeams = [
  { name: "Vantage Point", color: "#38bdf8", isPlayer: false },
  { name: "Iron Bridge", color: "#facc15", isPlayer: false },
  { name: "Northgate", color: "#a78bfa", isPlayer: false },
  { name: "Marrow Town", color: "#fb923c", isPlayer: false },
  { name: "Red Lion FC", color: "#ef4444", isPlayer: true },
  { name: "Colton Rovers", color: "#34d399", isPlayer: false },
  { name: "Ashfield United", color: "#f472b6", isPlayer: false },
].map((t, i) => ({ ...t, squad: makeSquad(`dt${i}`, HOME_NAMES) }));

const dynastyTable = [
  { teamIndex: 0, played: 12, won: 9, drawn: 2, lost: 1, goalsFor: 28, goalsAgainst: 10, points: 29 },
  { teamIndex: 1, played: 12, won: 8, drawn: 2, lost: 2, goalsFor: 24, goalsAgainst: 12, points: 26 },
  { teamIndex: 2, played: 12, won: 7, drawn: 3, lost: 2, goalsFor: 22, goalsAgainst: 14, points: 24 },
  { teamIndex: 3, played: 12, won: 6, drawn: 2, lost: 4, goalsFor: 19, goalsAgainst: 17, points: 20 },
  { teamIndex: 4, played: 12, won: 4, drawn: 3, lost: 5, goalsFor: 15, goalsAgainst: 18, points: 15 },
  { teamIndex: 5, played: 12, won: 2, drawn: 2, lost: 8, goalsFor: 11, goalsAgainst: 24, points: 8 },
  { teamIndex: 6, played: 12, won: 1, drawn: 2, lost: 9, goalsFor: 9, goalsAgainst: 27, points: 5 },
];

const dynastyLeague = {
  teams: dynastyTeams, table: dynastyTable, tier: 3,
  leagueName: "Euro Dynasty",
  fixtures: Array.from({ length: 24 }, () => []), // mid-season: matchweekIndex (12) < fixtures.length
};

const qualifyingLeagueProps = (extra = {}) => ({
  league: dynastyLeague, leagueResults: {}, matchweekIndex: 12, teamName: "Red Lion FC",
  playerSeasonStats: {}, playerRatingTracker: {}, squad: dynastyTeams[4].squad, startingXI: [], bench: [],
  seasonNumber: 3, clubHistory: { seasonArchive: [], cupHistory: [] },
  allTimeLeagueStatsByTier: {}, allLeagueStates: {}, leagueTier: 3,
  onPlayerClick: noop, onTeamClick: noop,
  seasonLeagueStatsByTier: {}, seasonLeagueStatsAvailable: true,
  ...extra,
});

// --- Squad progress — Most Improved -----------------------------------------

// Uniform attrs so getOverall() resolves to exactly `v` regardless of
// position weighting (weights sum to 1.00 per position).
const uniformAttrs = (v) => ({ pace: v, shooting: v, passing: v, defending: v, physical: v, technique: v, mental: v });

const improvedSquad = [
  { id: "mi1", name: "Ollie Vance", position: "ST", attrs: uniformAttrs(16) },
  { id: "mi2", name: "Danny Frost", position: "GK", attrs: uniformAttrs(14) },
  { id: "mi3", name: "Reggie Cole", position: "CB", attrs: uniformAttrs(15) },
];

// Ollie: joined season 1 at 10, now 16 (+6). Reggie: joined season 2 (mid-career
// signing) at 12, now 15 (+3) — proves the rate is measured from join OVR, not
// the club's season-1 baseline. Danny: unchanged (+0).
const improvedOvrHistory = [
  { w: 1, s: 1, p: { "Ollie Vance|ST": 10, "Danny Frost|GK": 14 } },
  { w: 10, s: 1, p: { "Ollie Vance|ST": 12, "Danny Frost|GK": 14 } },
  { w: 1, s: 2, p: { "Ollie Vance|ST": 13, "Danny Frost|GK": 14, "Reggie Cole|CB": 12 } },
  { w: 10, s: 2, p: { "Ollie Vance|ST": 16, "Danny Frost|GK": 14, "Reggie Cole|CB": 15 } },
];

// --- Cup — Team of the Cup --------------------------------------------------

// Cup match objects only ever carry name/tier stubs (no squad — see
// CupPage's teamOfCup memo), so the fixture mirrors that: squads live on the
// separate `league` prop and get resolved by team name.
function withBench(squad) {
  return squad.map(p => ({ ...p, isBench: false }));
}

const totcLeague = {
  teams: [
    { name: "Home Rovers", tier: 8, isPlayer: true, squad: withBench(makeSquad("tr", HOME_NAMES)) },
    { name: "Away Town", tier: 9, isPlayer: false, squad: withBench(makeSquad("at", AWAY_NAMES)) },
    { name: "Home Reserves", tier: 10, isPlayer: false, squad: withBench(makeSquad("hr", HOME_NAMES)) },
    { name: "Away Reserves", tier: 11, isPlayer: false, squad: withBench(makeSquad("ar", AWAY_NAMES)) },
  ],
};

const totcCup = {
  cupName: "The Concrete Cup", cupIcon: "🏆", cupColor: "#facc15",
  rounds: [
    {
      name: "Semi-Finals", matchweek: 30,
      matches: [
        {
          home: { name: "Home Rovers", tier: 8 }, away: { name: "Away Town", tier: 9 },
          result: { homeGoals: 3, awayGoals: 1, winner: { name: "Home Rovers" } },
        },
        {
          home: { name: "Home Reserves", tier: 10 }, away: { name: "Away Reserves", tier: 11 },
          result: { homeGoals: 0, awayGoals: 2, winner: { name: "Away Reserves" } },
        },
      ],
    },
    {
      name: "Final", matchweek: 34,
      matches: [
        {
          home: { name: "Home Rovers", tier: 8 }, away: { name: "Away Reserves", tier: 11 },
          result: { homeGoals: 2, awayGoals: 1, winner: { name: "Home Rovers" } },
        },
      ],
    },
  ],
  currentRound: 2,
  winner: { name: "Home Rovers" },
};

// --- Achievement toast ------------------------------------------------------

// Mounts the toast and swaps in a marker div once it self-dismisses, so the
// spec can assert the auto-dismiss timer actually fired.
function AchievementToastHarness() {
  const [done, setDone] = useState(false);
  if (done) return <div>TOAST DONE</div>;
  return <AchievementToast achievement="champion" muteSound onDone={() => setDone(true)} />;
}

// --- Cig cards ---------------------------------------------------------

// "champion" is a real, ungraded achievement. "mentality_monsters" is a
// genuinely legendary one — LEGENDARY_ACHIEVEMENTS also contains a broken
// id ("nominative_determinism") that matches no real achievement; don't
// pick that one for a "legendary collected" fixture or the card silently
// renders as non-legendary.
const cherryPack = CIG_PACKS.find((p) => p.id === "cherry_cigs");
const cherryUnlocked = new Set(cherryPack.achievementIds.slice(0, 5));
const cherryUnlockWeeks = Object.fromEntries(
  cherryPack.achievementIds.slice(0, 5).map((id, i) => [id, { season: 1, week: 4 + i * 3 }])
);

// --- Club — All-Time XI ------------------------------------------------

// Two adjacent defenders (CB1/CB2) carry deliberately long names — this is
// the pairing most likely to collide on a narrow viewport, since a 4-back
// line packs 4 nodes across the pitch width.
const LONG_CB1 = "Maximilian Featherstonehaugh";
const LONG_CB2 = "Bartholomew Winterbottom-Smythe";

// Slot keys match ALL_TIME_FORMATIONS["4-3-3"] exactly, and this candidate
// pool's position multiset (1×GK/LB/RB/AM/LW/ST/RW, 2×CB, 2×CM) is the only
// one that lets every slot in 4-3-3 fill from its own literal position —
// any other formation wastes at least one slot, so 4-3-3 always scores
// highest in pickBestFormation. Keeps the fixture deterministic.
const allTimeXI = {
  GK:  { name: "Danny Vaughan", position: "GK", avgRating: 7.6, season: 2, apps: 34, nationality: "ENG" },
  LB:  { name: "Curtis Lane", position: "LB", avgRating: 7.3, season: 3, apps: 30, nationality: "ENG" },
  CB1: { name: LONG_CB1, position: "CB", avgRating: 7.8, season: 4, apps: 32, nationality: "FRA" },
  CB2: { name: LONG_CB2, position: "CB", avgRating: 7.5, season: 1, apps: 28, nationality: "GER" },
  RB:  { name: "Ryan Poole", position: "RB", avgRating: 7.2, season: 2, apps: 26, nationality: "ENG" },
  CM1: { name: "Alfie Wilson", position: "CM", avgRating: 7.4, season: 5, apps: 40, nationality: "ENG" },
  CM2: { name: "Joe Marsh", position: "CM", avgRating: 7.1, season: 3, apps: 29, nationality: "ENG" },
  AM:  { name: "Nathan Robinson", position: "AM", avgRating: 8.0, season: 4, apps: 33, nationality: "ENG" },
  LW:  { name: "Kai Bennett", position: "LW", avgRating: 7.5, season: 2, apps: 27, nationality: "ENG" },
  ST:  { name: "Louie Adams", position: "ST", avgRating: 7.9, season: 5, apps: 38, nationality: "ENG" },
  RW:  { name: "Sonny Reid", position: "RW", avgRating: 7.6, season: 3, apps: 25, nationality: "ENG" },
};

const clubHistoryFixture = {
  totalWins: 118, totalDraws: 42, totalLosses: 36, totalGoalsFor: 402, totalGoalsConceded: 231,
  bestWinStreak: 11, bestUnbeatenRun: 19, worstLossStreak: 4,
  biggestWin: { score: "6-0", opponent: "Dale Athletic", season: 3 },
  worstDefeat: { score: "0-5", opponent: "Fenwick Rovers", season: 1 },
  bestSeasonFinish: { position: 1, leagueName: "Concrete Schoolyard", season: 4 },
  bestSeasonPoints: 88,
  playerCareers: {
    "Louie Adams": { goals: 74, assists: 12, apps: 152, motm: 9, yellows: 8, reds: 0, seasons: [1, 2, 3, 4, 5] },
  },
  seasonArchive: [
    { season: 1, tier: 11, leagueName: "Concrete Schoolyard", position: 2, points: 74, topScorer: "Louie Adams (18)", result: "promoted" },
  ],
  allTimeXI,
};

// Live-merge stubs — a live player rated lower than the archived ST so it
// exercises the merge path (src/components/club/ClubLegends.jsx) without
// displacing the deterministic archived XI above.
const liveSquadFixture = [{ id: "lp1", name: "Marcus Webb", position: "ST", nationality: "ENG" }];
const livePlayerSeasonStats = { "Marcus Webb": { goals: 3, assists: 1, apps: 5, position: "ST", nationality: "ENG" } };
const livePlayerRatingTracker = { lp1: [6.4, 6.8, 6.1, 6.9, 6.6] };

// --- Youth intake ------------------------------------------------------

function youthAttrs(base) {
  return { pace: base, shooting: base, passing: base, defending: base, physical: base, technique: base, mental: base };
}

// Potentials sit on the game's 1-20 attribute scale, inside each archetype's
// real range from generateYouthPlayer (raw 14-20, specialist 12-16, etc.).
const youthCandidates = [
  {
    id: "y0", name: "Callum Reyes", position: "ST", nationality: "BRA", age: 17,
    youthArchetype: "raw", potential: 18, attrs: youthAttrs(9),
  },
  {
    id: "y1", name: "Ollie Bramwell-Hutchinson", position: "CM", nationality: "ENG", age: 18,
    youthArchetype: "specialist", potential: 15, attrs: youthAttrs(12),
  },
  {
    id: "y2", name: "Divock Osei", position: "CB", nationality: "GHA", age: 16,
    youthArchetype: "wildcard", potential: 12, attrs: youthAttrs(8),
  },
  {
    id: "y3", name: "Jamie Cotterill", position: "RW", nationality: "WAL", age: 17,
    potential: 13, attrs: youthAttrs(11),
  },
];

const youthIntake = {
  candidates: youthCandidates,
  retirees: [],
};

// ---------------------------------------------------------------------------
// Renderers, keyed by registry id. Ids/labels/clickText live ONLY in
// registry.js — this map just attaches a renderer to each of them, and the
// assertion below throws at import time if the two drift.
// ---------------------------------------------------------------------------

const RENDERERS = {
  "match-brace": () => (
    <MatchResultScreen {...matchProps(matchResult({
      events: [
        beat(14, "Robinson breaks through on goal... but fires over!"),
        goal("home", "Nathan Robinson", "Alfie Wilson", 28, "#4ade80"),
        goal("home", "Nathan Robinson", null, 31, "#4ade80"),
        goal("away", "Max Doherty", "Reece Palmer", 67, "#38bdf8"),
      ],
      scorers: [
        { name: "Nathan Robinson", side: "home" }, { name: "Nathan Robinson", side: "home" },
        { name: "Max Doherty", side: "away" },
      ],
    }))} />
  ),
  "match-none": () => (
    <MatchResultScreen {...matchProps(matchResult({
      events: [beat(22, "Chance for Adams... saved!"), beat(70, "Doherty heads wide.")],
      scorers: [],
    }))} />
  ),
  "match-dupe-surnames": () => {
    const dupeHome = { ...homeTeam, squad: [
      ...homeTeam.squad, { id: "hx", name: "Kevin Adams", position: "CM" },
    ] };
    const dupeLeague = { teams: [dupeHome, awayTeam], table };
    return (
      <MatchResultScreen {...matchProps({
        home: 0, away: 1, isPlayerHome: true, penalties: null,
        playerRatings: ratings(HOME_NAMES, "h"),
        events: [
          goal("home", "Louie Adams", null, 20, "#4ade80"),
          goal("home", "Kevin Adams", "Louie Adams", 55, "#4ade80"),
        ],
        scorers: [{ name: "Louie Adams", side: "home" }, { name: "Kevin Adams", side: "home" }],
      }, { league: dupeLeague })} />
    );
  },
  "match-highlights": () => (
    <MatchResultScreen {...matchProps(matchResult({
      events: [goal("home", "Sonny Reid", "Kai Bennett", 40, "#4ade80")],
      scorers: [{ name: "Sonny Reid", side: "home" }],
    }), { matchDetail: "highlights" })} />
  ),
  "inbox-asst-training": () => <InboxHarness messages={[asstTrainingMsg(false)]} />,
  "inbox-asst-training-resolved": () => <InboxHarness messages={[asstTrainingMsg(true)]} />,
  "inbox-trial": () => <InboxHarness messages={[trialMsg()]} />,
  "inbox-poach": () => <InboxHarness messages={[poachMsg()]} />,
  // Lands on the TABLE tab; the spec clicks "STATS" (registry.clickText).
  "leaguestats-mid": () => (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <LeaguePage {...leagueStatsProps()} />
    </div>
  ),
  // Lands on the (default) LEAGUES tab — no clickText needed.
  "league-qualifying-zone": () => (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <LeaguePage {...qualifyingLeagueProps()} />
    </div>
  ),
  // Lands on the chart view; the spec clicks "MOST IMPROVED" (registry.clickText).
  "squad-progress-improved": () => (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 16 }}>
      <OvrProgressChart ovrHistory={improvedOvrHistory} squad={improvedSquad} ovrCap={20} />
    </div>
  ),
  // Lands on the BRACKET tab; the spec clicks "TOTC" (registry.clickText).
  "cup-totc": () => (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <CupPage
        cup={totcCup}
        clubHistory={{ cupHistory: [] }}
        seasonNumber={2}
        leagueRosters={{ 11: [{ name: "Home Rovers" }] }}
        league={totcLeague}
        allLeagueStates={{}}
        onPlayerClick={noop}
        onTeamClick={noop}
      />
    </div>
  ),
  "achievement-toast": () => <AchievementToastHarness />,
  "cig-card-states": () => (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start", background: "#0a0a17", padding: 32, minHeight: "100vh" }}>
      <div data-testid="cig-card-hidden"><CigCard achievementId="first_win" state="hidden" /></div>
      <div data-testid="cig-card-uncollected"><CigCard achievementId="clean_sheet" state="uncollected" /></div>
      <div data-testid="cig-card-collected"><CigCard achievementId="champion" state="collected" unlockWeek={{ season: 2, week: 18 }} /></div>
      <div data-testid="cig-card-legendary"><CigCard achievementId="mentality_monsters" state="collected" unlockWeek={{ season: 6, week: 3 }} /></div>
      <div data-testid="cig-card-progress">
        <CigCard achievementId="season_10" state="uncollected" progress={{ label: "SEASONS", current: 7, target: 10 }} />
      </div>
    </div>
  ),
  // Lands on the Cherry Cigs pack detail (spec clicks "Cherry Cigs", registry.clickText).
  "cig-pack-detail": () => (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <CigPacksTab
        unlockedPacks={new Set(["cherry_cigs"])}
        unlocked={cherryUnlocked}
        achievementUnlockWeeks={cherryUnlockWeeks}
        calendarIndex={16}
        seasonNumber={1}
        seasonLength={48}
      />
    </div>
  ),
  "alltime-xi": () => (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 16 }}>
      <ClubLegends
        clubHistory={clubHistoryFixture}
        teamName="Red Lion FC"
        playerSeasonStats={livePlayerSeasonStats}
        playerRatingTracker={livePlayerRatingTracker}
        squad={liveSquadFixture}
        seasonNumber={6}
        leagueTier={11}
        ovrHistory={[]}
        ovrCap={20}
      />
    </div>
  ),
  "youth-intake": () => (
    <YouthIntakeScreen
      intake={youthIntake}
      onDone={noop}
      squadSize={22}
      onClose={noop}
      ovrCap={20}
    />
  ),
};

const missingRenderer = REGISTRY.filter(f => !RENDERERS[f.id]).map(f => f.id);
const orphanedRenderer = Object.keys(RENDERERS).filter(id => !REGISTRY.some(f => f.id === id));
if (missingRenderer.length || orphanedRenderer.length) {
  throw new Error(
    "QA fixture registry/renderer mismatch — " +
    (missingRenderer.length ? `registry ids with no renderer: ${missingRenderer.join(", ")}. ` : "") +
    (orphanedRenderer.length ? `renderers with no registry entry: ${orphanedRenderer.join(", ")}.` : "")
  );
}

export const FIXTURES = REGISTRY.map(f => ({ ...f, render: RENDERERS[f.id] }));
export const FIXTURE_MAP = Object.fromEntries(FIXTURES.map(f => [f.id, f]));
