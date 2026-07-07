// Plain fixture metadata — the SINGLE source of fixture ids/labels,
// importable from BOTH the browser harness (qa/harness.jsx) and the
// Node-side Playwright spec (qa/tests/*.spec.js). No JSX here so the spec
// can import it without a React transform.
//
// Renderers live in components.jsx, keyed by these ids; it throws at import
// time if the two ever drift (id without a renderer, or renderer without an
// entry here).
//
// `clickText`: optional. If set, the spec clicks the first element whose
// text matches (a tab button etc.) before screenshotting, so fixtures can
// land on a specific sub-view (e.g. the LeaguePage STATS tab).
export const FIXTURES = [
  { id: "match-brace", label: "Match — brace by one scorer" },
  { id: "match-none", label: "Match — goalless" },
  { id: "match-dupe-surnames", label: "Match — duplicate surnames" },
  { id: "match-highlights", label: "Match — highlights mode" },
  { id: "inbox-asst-training", label: "Inbox — asst. manager training (unresolved)" },
  { id: "inbox-asst-training-resolved", label: "Inbox — asst. manager training (resolved)" },
  { id: "inbox-trial", label: "Inbox — trial offer (accept/decline)" },
  { id: "inbox-poach", label: "Inbox — poach (3 equivalent choices + refusal)" },
  { id: "leaguestats-mid", label: "League — stats tab mid-season", clickText: "STATS" },
  { id: "league-history", label: "League — history tab with an archived champion", clickText: "HISTORY" },
  { id: "league-alltime-empty", label: "League — ALL-TIME tab, consolidated empty state", clickText: "ALL-TIME" },
  { id: "league-qualifying-zone", label: "League — Dynasty Cup qualification Q chips" },
  { id: "squad-progress-improved", label: "Squad progress — most improved ranked view", clickText: "MOST IMPROVED" },
  { id: "cup-totc", label: "Cup — Team of the Cup (complete cup)", clickText: "TOTC" },
  { id: "achievement-toast", label: "Achievement — unlock toast (auto-dismiss)" },
  { id: "cig-card-states", label: "Cig cards — hidden/uncollected/collected/legendary" },
  { id: "cig-pack-detail", label: "Cig packs — pack detail card grid", clickText: "Cherry Cigs" },
  { id: "player-stats", label: "Player panel — STATS tab with OVR weighting" },
  { id: "player-progress", label: "Player panel — progress sparklines with season ticks", clickText: "PROGRESS" },
  { id: "alltime-xi", label: "Club — All-Time XI with long defender names", clickText: "ALL-TIME XI" },
  { id: "youth-intake", label: "Youth intake — prospects with potential" },
  { id: "player-compare", label: "Transfer target compare — two players side by side" },
];

export const FIXTURE_IDS = FIXTURES.map(f => f.id);
