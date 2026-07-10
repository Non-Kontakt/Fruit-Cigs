import { pickRandom } from "./calc.js";

// Pure post-match newspaper headline generator. No app wiring — this module
// only decides what the back page says, not when it's shown.

const BYLINE_TEMPLATES = [
  (r) => `— ${r} reports`,
  (r) => `${r}, at the ground`,
  (r) => `words: ${r}`,
  (r) => `${r} writes`,
  (r) => `— ${r}, our man at the match`,
  (r) => `reporting: ${r}`,
];

function byline(ctx) {
  if (!ctx.reporterName) return "";
  return pickRandom(BYLINE_TEMPLATES)(ctx.reporterName);
}

function deriveResult(ctx) {
  const pg = ctx.playerGoals ?? 0;
  const og = ctx.oppGoals ?? 0;
  const won = pg > og;
  const lost = pg < og;
  const drawn = pg === og;
  const margin = Math.abs(pg - og);
  return { pg, og, won, lost, drawn, margin };
}

function hattrickScorer(ctx) {
  if (!Array.isArray(ctx.scorers)) return null;
  return ctx.scorers.find(s => s.goals >= 3) || null;
}

// 3 -> "3RD", 4 -> "4TH", 21 -> "21ST" — for streak copy.
function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}TH`;
  const last = n % 10;
  return `${n}${last === 1 ? "ST" : last === 2 ? "ND" : last === 3 ? "RD" : "TH"}`;
}

// ---------------------------------------------------------------------------
// selectHeadlineCategory — deterministic, first match wins
// ---------------------------------------------------------------------------
export function selectHeadlineCategory(ctx = {}) {
  const { won, lost, drawn, margin } = deriveResult(ctx);

  // 1. Cup final
  if (ctx.isCupFinal) {
    return won ? "cup_final_win" : "cup_final_loss";
  }

  // 2. Record
  if ((ctx.recordUnbeatenRun || ctx.seasonBiggestWin) && (won || drawn)) {
    return "record";
  }

  // 3. Hattrick
  if (hattrickScorer(ctx) && (won || drawn)) {
    return "hattrick";
  }

  // 4. Derby (dormant hook — no caller sets isDerby yet)
  if (ctx.isDerby) {
    return won ? "derby_win" : "derby_loss";
  }

  // 5. Went top
  if (ctx.wentTop && won) {
    return "went_top";
  }

  // 6. Hot streak
  if (((ctx.winStreak ?? 0) >= 4 || (ctx.unbeatenRun ?? 0) >= 6) && (won || drawn)) {
    return "streak_hot";
  }

  // 7. Cold streak
  if ((ctx.lossStreak ?? 0) >= 3 && lost) {
    return "streak_cold";
  }

  // 8. Board crisis
  if (lost && (ctx.boardSentiment ?? 100) <= 25) {
    return "board_crisis";
  }

  // 9. Thrashing
  if (margin >= 3) {
    return won ? "thrashing_win" : lost ? "thrashing_loss" : "win"; // margin>=3 implies not a draw
  }

  // 10. Clean sheet run
  if (won && ctx.cleanSheet && (ctx.cleanSheetStreak ?? 0) >= 3) {
    return "clean_sheet_run";
  }

  // 11. Fallbacks
  if (won) return "win";
  if (drawn) return "draw";
  return "loss";
}

// ---------------------------------------------------------------------------
// Template pools — every entry is a function of (ctx, derived) -> headline string
// ---------------------------------------------------------------------------

function names(ctx) {
  const tn = (ctx.teamName || "WE").toUpperCase();
  const on = (ctx.opponentName || "OPPONENTS").toUpperCase();
  return { tn, on };
}

// Appends reporter-woven headline variants to a base pool, only when
// reporterName is present (guards against "undefined" leaking into copy).
function withReporter(base, ctx, extra) {
  if (!ctx.reporterName) return base;
  const rn = ctx.reporterName.toUpperCase();
  return [...base, ...extra(rn)];
}

const TEMPLATES = {
  cup_final_win: (ctx, d) => {
    const { tn, on } = names(ctx);
    const round = (ctx.cupRoundName || "THE FINAL").toUpperCase();
    const pool = withReporter([
      () => `${tn} LIFT THE CUP! ${d.pg}-${d.og} OVER ${on} IN ${round}`,
      () => `GLORY! ${tn} CROWNED CUP CHAMPIONS AFTER ${d.pg}-${d.og} WIN OVER ${on}`,
      () => `HISTORY MADE — ${tn} BEAT ${on} ${d.pg}-${d.og} TO WIN THE CUP`,
      () => `${tn} ARE CUP KINGS! ${on} SEEN OFF ${d.pg}-${d.og} AT THE FINAL HURDLE`,
      () => `CUP FINAL FAIRYTALE: ${tn} ${d.pg}-${d.og} ${on}`,
      () => `${tn} MAKE IT COUNT — ${d.pg}-${d.og} TRIUMPH OVER ${on} SEALS THE CUP`,
    ], ctx, (rn) => [
      () => `"THE STUFF OF DREAMS" — ${rn} ON ${tn}'S ${d.pg}-${d.og} CUP FINAL WIN OVER ${on}`,
    ]);
    return pickRandom(pool)();
  },
  cup_final_loss: (ctx, d) => {
    const { tn, on } = names(ctx);
    const pool = withReporter([
      () => `HEARTBREAK AT THE FINAL — ${tn} FALL ${d.pg}-${d.og} TO ${on}`,
      () => `SO NEAR, SO FAR: ${tn} LOSE CUP FINAL ${d.pg}-${d.og} AGAINST ${on}`,
      () => `${on} BREAK ${tn} HEARTS ${d.pg}-${d.og} IN THE FINAL`,
      () => `CUP DREAM OVER — ${tn} BEATEN ${d.pg}-${d.og} BY ${on}`,
      () => `AGONY AT THE LAST: ${tn} ${d.pg}-${d.og} ${on} IN THE FINAL`,
      () => `${tn} LEFT EMPTY-HANDED AS ${on} WIN IT ${d.og}-${d.pg}`,
    ], ctx, (rn) => [
      () => `"HEARTS WILL BE HEAVY TONIGHT" — ${rn} ON ${tn}'S ${d.pg}-${d.og} FINAL DEFEAT TO ${on}`,
    ]);
    return pickRandom(pool)();
  },
  record: (ctx, d) => {
    const { tn, on } = names(ctx);
    if (ctx.recordUnbeatenRun) {
      // Season-scoped run when the caller provides it (see
      // getSeasonUnbeatenRun in utils/league.js) — falls back to the
      // (career) unbeatenRun field for callers/tests that don't set it, so
      // this headline never claims a streak that reaches back past this
      // season's own results.
      const run = ctx.seasonUnbeatenRun ?? ctx.unbeatenRun ?? "record";
      return pickRandom([
        () => `${run} NOT OUT! ${tn} STRETCH UNBEATEN RUN PAST ${on}`,
        () => `HISTORY IN THE MAKING — ${tn} NOW ${run} MATCHES WITHOUT DEFEAT`,
        () => `WHO STOPS THEM? ${tn} HIT ${run} UNBEATEN AND COUNTING`,
        () => `NO ONE CAN LIVE WITH THEM — ${tn} UNBEATEN IN ${run} AFTER ${on}`,
        () => `${run} AND STILL GOING — ${tn}'S GREAT RUN CONTINUES PAST ${on}`,
      ])();
    }
    return pickRandom([
      () => `RECORD ROUT! ${tn} SMASH ${on} ${d.pg}-${d.og} FOR BIGGEST WIN OF THE SEASON`,
      () => `${tn} SET THE STANDARD — ${d.pg}-${d.og} DEMOLITION OF ${on} A SEASON BEST`,
      () => `NEVER BETTERED: ${tn}'S ${d.pg}-${d.og} WIN OVER ${on} TOPS THE LOT`,
      () => `${tn} INTO THE HISTORY BOOKS WITH ${d.pg}-${d.og} SEASON-BEST WIN OVER ${on}`,
      () => `BIGGEST OF THE LOT — ${tn} ${d.pg}-${d.og} ${on} THE SEASON'S FINEST HOUR`,
    ])();
  },
  hattrick: (ctx, d) => {
    const { tn, on } = names(ctx);
    const scorer = (hattrickScorer(ctx)?.name || "THE HERO").toUpperCase();
    const pool = withReporter([
      () => `${scorer} HAT-TRICK HERO AS ${tn} ${d.pg}-${d.og} ${on}`,
      () => `TREBLE TROUBLE FOR ${on} — ${scorer} BAGS A HAT-TRICK IN ${d.pg}-${d.og} WIN`,
      () => `${scorer} MAKES IT A HAT-TRICK! ${tn} ${d.pg}-${d.og} ${on}`,
      () => `HAT-TRICK HERO: ${scorer} FIRES ${tn} PAST ${on} ${d.pg}-${d.og}`,
      () => `${scorer} ON FIRE WITH TREBLE AS ${tn} SEE OFF ${on} ${d.pg}-${d.og}`,
      () => `THREE AND EASY — ${scorer}'S HAT-TRICK SINKS ${on} ${d.pg}-${d.og}`,
    ], ctx, (rn) => [
      () => `"A NIGHT TO REMEMBER" — ${rn} ON ${scorer}'S HAT-TRICK IN ${tn}'S ${d.pg}-${d.og} WIN`,
    ]);
    return pickRandom(pool)();
  },
  derby_win: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `DERBY DELIGHT! ${tn} BEAT ${on} ${d.pg}-${d.og} TO RULE THE CITY`,
      () => `BRAGGING RIGHTS SECURED — ${tn} ${d.pg}-${d.og} ${on} IN THE DERBY`,
      () => `${tn} OWN THE DERBY — ${on} SENT HOME ${d.pg}-${d.og}`,
      () => `LOCAL HEROES: ${tn} DOWN RIVALS ${on} ${d.pg}-${d.og} IN THE DERBY`,
    ])();
  },
  derby_loss: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `DERBY DISASTER — ${tn} FALL ${d.pg}-${d.og} TO ${on}`,
      () => `BRAGGING RIGHTS GO TO ${on} AFTER ${d.pg}-${d.og} DERBY DEFEAT`,
      () => `${tn} HUMBLED BY ${on} ${d.pg}-${d.og} IN THE DERBY`,
      () => `DERBY DAY MISERY: ${on} BEAT ${tn} ${d.og}-${d.pg}`,
    ])();
  },
  went_top: (ctx, d) => {
    const { tn, on } = names(ctx);
    const pool = withReporter([
      () => `${tn} GO TOP! ${d.pg}-${d.og} WIN OVER ${on} SENDS THEM TO THE SUMMIT`,
      () => `TOP OF THE PILE — ${tn} CLIMB TO FIRST AFTER ${d.pg}-${d.og} OVER ${on}`,
      () => `SUMMIT REACHED: ${tn} ${d.pg}-${d.og} ${on} PUTS THEM TOP OF THE TABLE`,
      () => `${tn} ON TOP OF THE WORLD AFTER ${d.pg}-${d.og} DEFEAT OF ${on}`,
      () => `LEADERS OF THE PACK — ${on} BEATEN ${d.pg}-${d.og} AS ${tn} HIT NUMBER ONE`,
      () => `VIEW FROM THE TOP: ${tn} GO FIRST WITH ${d.pg}-${d.og} WIN OVER ${on}`,
    ], ctx, (rn) => [
      () => `"THEY'RE FLYING NOW" — ${rn} AS ${tn} GO TOP WITH ${d.pg}-${d.og} WIN OVER ${on}`,
    ]);
    return pickRandom(pool)();
  },
  streak_hot: (ctx, d) => {
    const { tn, on } = names(ctx);
    const streak = (ctx.winStreak ?? 0) >= 4 ? ctx.winStreak : ctx.unbeatenRun;
    const label = (ctx.winStreak ?? 0) >= 4 ? "WINS" : "UNBEATEN";
    // A draw can extend an unbeaten run — keep win-flavoured copy for wins only.
    const neutral = [
      () => `NOBODY CAN STOP THEM: ${tn}'S ${streak}-GAME ${label} STREAK ROLLS ON`,
      () => `${streak} AND COUNTING — ${tn} ${d.pg}-${d.og} ${on} EXTENDS THE RUN`,
      () => `${tn} MARCH ON — ${streak}-MATCH RUN INTACT AFTER ${d.pg}-${d.og} WITH ${on}`,
    ];
    const winOnly = [
      () => `UNSTOPPABLE! ${tn} MAKE IT ${streak} ${label} IN A ROW AFTER ${d.pg}-${d.og} OVER ${on}`,
      () => `${tn} ON FIRE — ${streak}-MATCH ${label} RUN CONTINUES PAST ${on}`,
      () => `FORM OF THEIR LIVES: ${tn} MAKE IT ${streak} ${label} WITH WIN OVER ${on}`,
      () => `${tn} SWEEPING ALL BEFORE THEM — ${streak}-MATCH RUN AFTER ${d.pg}-${d.og} VS ${on}`,
    ];
    return pickRandom(d.won ? [...winOnly, ...neutral] : neutral)();
  },
  streak_cold: (ctx, d) => {
    const { tn, on } = names(ctx);
    const streak = ctx.lossStreak ?? 0;
    return pickRandom([
      () => `${tn} SINK TO ${ordinal(streak)} STRAIGHT DEFEAT — ${d.pg}-${d.og} TO ${on}`,
      () => `WON'T STOP LOSING: ${tn} MAKE IT ${streak} DEFEATS IN A ROW AFTER ${on} LOSS`,
      () => `FREE FALL CONTINUES — ${tn} LOSE ${ordinal(streak)} ON THE BOUNCE TO ${on}`,
      () => `${streak} AND SINKING: ${tn} ${d.pg}-${d.og} ${on} SPELLS FURTHER MISERY`,
      () => `CRISIS DEEPENS — ${tn} EXTEND WINLESS RUN TO ${streak} WITH LOSS TO ${on}`,
      () => `NO END IN SIGHT: ${on} MAKE IT ${streak} STRAIGHT LOSSES FOR STRUGGLING ${tn}`,
    ])();
  },
  board_crisis: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `BOARD RUNNING OUT OF PATIENCE AS ${tn} LOSE ${d.pg}-${d.og} TO ${on}`,
      () => `SACKING WATCH: BOARD SEETHES AFTER ${d.pg}-${d.og} DEFEAT TO ${on}`,
      () => `KNIVES OUT AT ${tn} AFTER ANOTHER LOSS — ${d.pg}-${d.og} TO ${on}`,
      () => `BOARDROOM FURY AS ${tn} SLIP TO ${d.pg}-${d.og} DEFEAT TO ${on}`,
      () => `THE END IS NIGH? ${tn} BOARD WEIGHS OPTIONS AFTER ${on} LOSS`,
      () => `PATIENCE WEARING THIN: ${tn} BOARD WATCHES ON AS ${on} WIN ${d.og}-${d.pg}`,
    ])();
  },
  thrashing_win: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `${tn} PUT ${d.pg} PAST ${on} IN ${d.pg}-${d.og} DEMOLITION`,
      () => `HUMILIATION FOR ${on} AS ${tn} RUN RIOT ${d.pg}-${d.og}`,
      () => `${tn} GO GOAL CRAZY — ${on} TAKEN APART ${d.pg}-${d.og}`,
      () => `NO MERCY: ${tn} THRASH ${on} ${d.pg}-${d.og}`,
      () => `${on} TORN TO SHREDS — ${tn} WIN ${d.pg}-${d.og} AT A CANTER`,
      () => `ROUT! ${tn} ${d.pg}-${d.og} ${on} IN ONE-SIDED AFFAIR`,
    ])();
  },
  thrashing_loss: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `SHAMBLES! ${tn} TORN APART ${d.pg}-${d.og} BY ${on}`,
      () => `EMBARRASSMENT AT THE PUB — ${tn} HUMILIATED ${d.pg}-${d.og} BY ${on}`,
      () => `${tn} CAVE IN — ${on} PUT ${d.og} PAST THEM IN ${d.og}-${d.pg} MAULING`,
      () => `RED-FACED ${tn} SUFFER ${d.pg}-${d.og} HAMMERING FROM ${on}`,
      () => `NOWHERE TO HIDE: ${tn} DEMOLISHED ${d.pg}-${d.og} BY ${on}`,
      () => `CHAOS AND CRINGE — ${tn} FALL APART IN ${d.pg}-${d.og} DEFEAT TO ${on}`,
    ])();
  },
  clean_sheet_run: (ctx, d) => {
    const { tn, on } = names(ctx);
    const streak = ctx.cleanSheetStreak ?? 0;
    return pickRandom([
      () => `FORTRESS ${tn}! ${ordinal(streak)} CLEAN SHEET IN A ROW IN ${d.pg}-${d.og} WIN OVER ${on}`,
      () => `NOTHING GETS PAST THEM — ${tn} MAKE IT ${streak} SHUTOUTS ON THE BOUNCE`,
      () => `${tn} DEFENCE UNBREAKABLE: ${streak} CLEAN SHEETS RUNNING AFTER ${on} WIN`,
      () => `LOCKED OUT: ${on} CAN'T SCORE AS ${tn} POST ${ordinal(streak)} STRAIGHT CLEAN SHEET`,
      () => `IRON CURTAIN — ${tn}'S ${streak}-MATCH CLEAN SHEET RUN CONTINUES VS ${on}`,
    ])();
  },
  win: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `${tn} TRIUMPH ${d.pg}-${d.og} OVER ${on}`,
      () => `JOB DONE — ${tn} SEE OFF ${on} ${d.pg}-${d.og}`,
      () => `${tn} EDGE PAST ${on} ${d.pg}-${d.og}`,
      () => `THREE POINTS IN THE BAG: ${tn} BEAT ${on} ${d.pg}-${d.og}`,
      () => `${tn} GET THE JOB DONE AGAINST ${on}, ${d.pg}-${d.og}`,
      () => `WINNING WAYS CONTINUE — ${tn} ${d.pg}-${d.og} ${on}`,
      () => `${tn} MAKE IT COUNT VS ${on}: ${d.pg}-${d.og}`,
    ])();
  },
  draw: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `HONOURS EVEN — ${tn} DRAW ${d.pg}-${d.og} WITH ${on}`,
      () => `SHARED SPOILS: ${tn} ${d.pg}-${d.og} ${on}`,
      () => `${tn} HELD TO ${d.pg}-${d.og} DRAW BY ${on}`,
      () => `POINT APIECE AS ${tn} AND ${on} SHARE ${d.pg}-${d.og} SPOILS`,
      () => `STALEMATE: ${tn} ${d.pg}-${d.og} ${on}`,
      () => `${tn} SETTLE FOR A POINT AGAINST ${on}, ${d.pg}-${d.og}`,
    ])();
  },
  loss: (ctx, d) => {
    const { tn, on } = names(ctx);
    return pickRandom([
      () => `${tn} SUFFER ${d.pg}-${d.og} LOSS TO ${on}`,
      () => `${tn} BEATEN ${d.pg}-${d.og} BY ${on}`,
      () => `NO JOY FOR ${tn} — ${d.pg}-${d.og} DEFEAT TO ${on}`,
      () => `${tn} SLIP TO ${d.pg}-${d.og} DEFEAT AGAINST ${on}`,
      () => `TOUGH DAY AT THE OFFICE: ${tn} LOSE ${d.pg}-${d.og} TO ${on}`,
      () => `${on} GET THE BETTER OF ${tn}, ${d.og}-${d.pg}`,
    ])();
  },
};

// ---------------------------------------------------------------------------
// Season-defining front pages — the rare editions worth forwarding to the
// manager's inbox rather than living only on the dashboard masthead.
// ---------------------------------------------------------------------------
const SEASON_TEMPLATES = {
  champions: [
    (tn, ln) => `CHAMPIONS! ${tn} CROWNED KINGS OF ${ln}`,
    (tn, ln) => `${tn} WIN THE LOT — ${ln} TITLE SEALED`,
    (tn, ln) => `GLORY DAYS: ${tn} ARE ${ln} CHAMPIONS`,
    (tn, ln) => `THE TITLE COMES HOME — ${tn} TOP OF ${ln}`,
    (tn) => `PUT IT ON THE HONOURS BOARD: ${tn}, CHAMPIONS`,
  ],
  promoted: [
    (tn, ln) => `GOING UP! ${tn} SEAL PROMOTION FROM ${ln}`,
    (tn) => `NEXT STOP, THE BIG TIME — ${tn} PROMOTED`,
    (tn, ln) => `UP AND AWAY: ${tn} CLIMB OUT OF ${ln}`,
    (tn) => `PROMOTION PARTY — DRINKS ON THE HOUSE AT ${tn}`,
  ],
  relegated: [
    (tn, ln) => `DOWN AND OUT — ${tn} RELEGATED FROM ${ln}`,
    (tn) => `THE DROP CLAIMS ${tn}`,
    (tn, ln) => `DARK DAY: ${tn} SENT DOWN FROM ${ln}`,
    (tn) => `ROCK BOTTOM — RELEGATION CONFIRMED FOR ${tn}`,
  ],
};

export function generateSeasonHeadline({ type, teamName, leagueName }) {
  const pool = SEASON_TEMPLATES[type];
  if (!pool) return null;
  const tn = (teamName || "WE").toUpperCase();
  const ln = (leagueName || "THE LEAGUE").toUpperCase();
  return pickRandom(pool)(tn, ln);
}

// ---------------------------------------------------------------------------
// Awards Night back page — Player of the Season is the headline pick (the
// biggest individual honour of the three). NOT wired to setLatestHeadline:
// the dashboard masthead only shows latestHeadline when its calendarIndex
// matches the most recently PLAYED result, and the summer break has already
// moved calendarIndex one past that match by the time Awards Night fires
// (same gate the season-preview headline hit) — so this only ever supplies
// the "— {newspaperName}" flavour line inside the inbox message body.
// ---------------------------------------------------------------------------
const AWARDS_TEMPLATES = [
  (ctx) => `${(ctx.winnerName || ctx.teamName || "OUR PLAYER").toUpperCase()} NAMED PLAYER OF THE SEASON AT ${(ctx.teamName || "THE CLUB").toUpperCase()}`,
  (ctx) => `${(ctx.newspaperName || "THE GAZETTE").toUpperCase()} NAMES ${(ctx.winnerName || "").toUpperCase()} THE LEAGUE'S PLAYER OF THE SEASON`,
  (ctx) => `AWARDS NIGHT GLORY — ${(ctx.winnerName || "").toUpperCase()} TAKES TOP HONOUR AT ${(ctx.teamName || "THE CLUB").toUpperCase()}`,
];

export function generateAwardsHeadline({ teamName, winnerName, newspaperName, reporterName }) {
  const ctx = { teamName, winnerName, newspaperName, reporterName };
  const headline = pickRandom(AWARDS_TEMPLATES)(ctx);
  return { headline, byline: byline(ctx) };
}

// ---------------------------------------------------------------------------
// Squad identity headline — the paper noticing what kind of team training
// has built (see utils/squadIdentity.js for the archetype classification).
// A rare, periodic beat, not tied to any match result, so — same reasoning
// as AWARDS_TEMPLATES above — it's NOT wired to setLatestHeadline; the
// caller delivers it as an inbox one-liner instead.
// ---------------------------------------------------------------------------
const IDENTITY_TEMPLATES = {
  "counter-attacking": [
    (ctx) => `${ctx.tn} BUILT ON PACE — ${(ctx.newspaperName || "THE GAZETTE").toUpperCase()} DUBS THEM THE COUNTER-ATTACK KINGS`,
    (ctx) => `SPEED KILLS: ${ctx.tn} IDENTITY IS ALL ABOUT THE COUNTER-ATTACK`,
    (ctx) => `${ctx.tn} PLAY ON THE BREAK — AND NO ONE CAN LIVE WITH THE PACE`,
  ],
  "defensive-wall": [
    (ctx) => `${ctx.tn} BUILT ON A DEFENSIVE WALL — NOTHING GETS THROUGH`,
    (ctx) => `FORTRESS ${ctx.tn}: THE TRAINING GROUND TELLS THE STORY OF A DEFENSIVE WALL`,
    (ctx) => `${(ctx.newspaperName || "THE GAZETTE").toUpperCase()} NAMES ${ctx.tn} THE DIVISION'S DEFENSIVE WALL`,
  ],
  possession: [
    (ctx) => `${ctx.tn} MAKE IT LOOK EASY — A POSSESSION SIDE THROUGH AND THROUGH`,
    (ctx) => `PASS MASTERS: ${ctx.tn}'S IDENTITY IS BUILT ON POSSESSION`,
    (ctx) => `${(ctx.newspaperName || "THE GAZETTE").toUpperCase()} ON ${ctx.tn}: A TEAM THAT WON'T GIVE UP THE BALL`,
  ],
};

export function generateIdentityHeadline({ teamName, archetype, newspaperName, reporterName }) {
  const pool = IDENTITY_TEMPLATES[archetype];
  if (!pool) return null;
  const ctx = { tn: (teamName || "THE CLUB").toUpperCase(), newspaperName, reporterName };
  const headline = pickRandom(pool)(ctx);
  return { headline, byline: byline(ctx) };
}

// ---------------------------------------------------------------------------
// generateMatchHeadline
// ---------------------------------------------------------------------------
export function generateMatchHeadline(ctx = {}) {
  const category = selectHeadlineCategory(ctx);
  const d = deriveResult(ctx);
  const templateFn = TEMPLATES[category] || TEMPLATES.win;
  const headline = templateFn(ctx, d);
  return { category, headline, byline: byline(ctx) };
}
