// Plain fixture metadata — importable from BOTH the browser harness
// (qa/harness.jsx) and the Node-side Playwright spec (qa/tests/*.spec.js).
// No JSX here so the spec can import it without a React transform.
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
  { id: "inbox-trial", label: "Inbox — trial offer" },
  { id: "inbox-poach", label: "Inbox — poach (3 equivalent choices)" },
  { id: "leaguestats-mid", label: "League — stats tab mid-season", clickText: "STATS" },
];

export const FIXTURE_IDS = FIXTURES.map(f => f.id);
