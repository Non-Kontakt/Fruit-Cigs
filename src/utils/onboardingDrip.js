// Assistant-manager onboarding drip — one short message per major system,
// delivered over a new career's first season as each system becomes
// relevant. Skippable: the week-1 training intro's "I Know What I'm Doing"
// choice sets onboardingDripSuppressed, which silences every step below
// (see App.jsx's handleInboxChoice for asst_mgr_training_intro). Old saves
// hydrate with onboardingDripSuppressed defaulted true, so existing players
// never see this — only a genuinely new career starts it off.
//
// The week-1 squad/training message itself (MSG.asstMgrTrainingIntro) is
// NOT one of the steps below — it already exists and fires from the
// league-init effect in App.jsx, independent of this drip.
//
// Each step fires once, gated on its own condition. Conditions are written
// to stay true once met (monotonic) rather than firing on an exact instant,
// so a step queued behind another one in the same week isn't lost — it
// just fires on the next weekly check instead.
//
// getNextOnboardingDripMessage() is called once per weekly advance and
// returns at most one message to post (the first unsent, ready step, in
// the order below) — never more than one drip message in the same week.

// Every tip carries its own exit — a new manager shouldn't need to dig out
// the week-1 intro message to silence the rest of the drip.
const DRIP_CHOICES = [
  { label: "Got It",          value: "ack",       tone: "primary", resultText: "Noted." },
  { label: "Stop These Tips", value: "drip_stop", tone: "neutral", resultText: "The assistant will keep his tips to himself." },
];

const STEPS = [
  {
    id: "msg_onboarding_matchday",
    when: (s) => (s.matchweekIndex || 0) >= 1,
    build: () => ({
      id: "msg_onboarding_matchday",
      icon: "📰",
      color: "#f59e0b",
      title: "Asst. Manager's Notes",
      type: "onboarding_drip",
      choices: DRIP_CHOICES,
      body: "First result's in, boss. Results land in your inbox, and the BACK PAGE on the dashboard has the paper's take on it — worth a read after every match.",
    }),
  },
  {
    id: "msg_onboarding_transfers",
    when: (s) => (s.calendarIndex || 0) >= 2,
    build: () => ({
      id: "msg_onboarding_transfers",
      icon: "🤝", // 🤝
      color: "#f59e0b",
      title: "Asst. Manager's Notes",
      type: "onboarding_drip",
      choices: DRIP_CHOICES,
      body: "Worth a look at the TRANSFERS tab even this early, boss. Building a relationship with a club now makes it easier to do business with them once the window actually opens.",
    }),
  },
  {
    id: "msg_onboarding_cigpacks",
    when: (s) => (s.unlockedAchievements?.size || 0) > 0,
    build: () => ({
      id: "msg_onboarding_cigpacks",
      icon: "🎴", // 🎴
      color: "#f59e0b",
      title: "Asst. Manager's Notes",
      type: "onboarding_drip",
      choices: DRIP_CHOICES,
      body: "That's your first achievement, boss. Every one you unlock earns Cig Packs — open them from the CORNER SHOP for cards, tickets and the odd surprise.",
    }),
  },
  {
    id: "msg_onboarding_club_mood",
    when: (s) => (s.calendarIndex || 0) >= 4,
    build: () => ({
      id: "msg_onboarding_club_mood",
      icon: "📋", // 📋
      color: "#f59e0b",
      title: "Asst. Manager's Notes",
      type: "onboarding_drip",
      choices: DRIP_CHOICES,
      body: "Keep an eye on the CLUB tab, boss — fan mood and the board's patience both move with results, and if either runs out it comes back on you.",
    }),
  },
  {
    id: "msg_onboarding_cup",
    when: (s) => {
      const cupEntryIdx = (s.seasonCalendar || []).findIndex(e => e.type === "cup" && e.cupRound === 0);
      return cupEntryIdx !== -1 && (s.calendarIndex || 0) >= Math.max(0, cupEntryIdx - 1);
    },
    build: () => ({
      id: "msg_onboarding_cup",
      icon: "🏆", // 🏆
      color: "#f59e0b",
      title: "Asst. Manager's Notes",
      type: "onboarding_drip",
      choices: DRIP_CHOICES,
      body: "Cup football's up next, boss. It runs alongside the league on its own knockout bracket — lose and you're out for the season, so check the CUP tab before you pick your XI.",
    }),
  },
];

/**
 * Decide the next onboarding-drip message to post, if any.
 * Pure — takes the fields it needs off a state-shaped object and returns
 * either a ready-to-post message (fields only; caller wraps with
 * createInboxMessage) or null.
 */
export function getNextOnboardingDripMessage(state) {
  if (!state || state.onboardingDripSuppressed) return null;
  if ((state.seasonNumber || 1) !== 1) return null;
  const sentIds = new Set((state.inboxMessages || []).map(m => m.id));
  for (const step of STEPS) {
    if (sentIds.has(step.id)) continue;
    if (step.when(state)) return step.build();
  }
  return null;
}

/**
 * Teacher's Pet — every one of the assistant's drip tips has landed in the
 * inbox. Pure — takes the same inboxMessages array getNextOnboardingDripMessage
 * reads, so it can be checked at the same weekly site without re-deriving state.
 */
export function hasReceivedAllDripMessages(inboxMessages) {
  const sentIds = new Set((inboxMessages || []).map(m => m.id));
  return STEPS.every(step => sentIds.has(step.id));
}
