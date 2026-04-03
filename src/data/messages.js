import { C } from "./tokens.js";
import { LEAGUE_DEFS } from "./leagues.js";
import { pickRandom } from "../utils/calc.js";

/**
 * Inbox message templates.
 *
 * Each function returns a plain object with content fields (icon, title, body,
 * color, and optionally id, type, choices, visibleFromIndex, week, etc.).
 *
 * Usage:  createInboxMessage(MSG.welcome(), { calendarIndex, seasonNumber })
 *   or:  createInboxMessage({ ...MSG.trialOffer(p, w) }, timeCtx)
 */

// ---------------------------------------------------------------------------
// SYSTEM
// ---------------------------------------------------------------------------

const welcome = () => ({
  id: "msg_welcome",
  icon: "\uD83D\uDCF0", // 📰
  title: "Welcome to the Boot Room",
  body: "This is your hub for news, messages and notifications. Check back here as your season progresses.",
  color: C.blue,
});

const boardExpectations = (leagueTier) => ({
  id: "msg_board",
  icon: "\uD83C\uDFDF\uFE0F", // 🏟️
  title: "Board Expectations",
  body: `The board expects a solid mid-table finish this season in ${LEAGUE_DEFS[leagueTier]?.name || "Sunday League"}. Prove them wrong.`,
  color: C.textMuted,
});

// ---------------------------------------------------------------------------
// BOARD
// ---------------------------------------------------------------------------

const boardReward = (ticketName) => ({
  id: `msg_board_ticket_${Date.now()}`,
  icon: "\uD83C\uDFAB", // 🎫
  color: C.amber,
  title: "Board Reward",
  body: `The board are impressed with your work. They've sent over a ${ticketName} as a token of their confidence.`,
});

const boardUltimatum = (target) => ({
  id: `msg_ultimatum_${Date.now()}`,
  icon: "\u26A0\uFE0F", // ⚠️
  color: C.lightRed,
  title: "Board Ultimatum",
  body: `Results have fallen well below what we expect. You have five league matches to earn at least ${target} points, or we will be forced to make a change.`,
});

const boardConcern = (isSecond) => ({
  id: `msg_board_warn_${Date.now()}`,
  icon: "\uD83D\uDCCB", // 📋
  color: C.lightRed,
  title: "Board Concern",
  body: isSecond
    ? "The board met again this morning. This is the second time we've had to raise this \u2014 results must improve immediately. Do not make us do this again."
    : "The board has requested a meeting. Results need to improve \u2014 patience is wearing thin.",
});

const boardReprieve = () => ({
  id: `msg_reprieve_${Date.now()}`,
  icon: "\u2705", // ✅
  color: "#4ade80",
  title: "Board Reprieve",
  body: "The board has been impressed by your response. You have their full support \u2014 for now.",
});

const fanRally = () => ({
  id: `msg_cup_hope_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  color: C.amber,
  title: "Fan Rally",
  body: "Fan reaction to your cup run has given the board cause to reconsider.",
});

const cupReprieve = () => ({
  id: `msg_cup_reprieve_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  color: "#4ade80",
  title: "Board Reprieve",
  body: "Fan reaction to your cup run has given the board cause to reconsider. Your job is safe \u2014 for now.",
});

// ---------------------------------------------------------------------------
// TRAINING
// ---------------------------------------------------------------------------

const asstMgrTrainingIntro = () => ({
  id: "msg_asst_mgr_training_intro",
  week: 3,
  icon: "\uD83D\uDCCB", // 📋
  color: "#f59e0b",
  title: "Asst. Manager's Notes",
  body: "Boss, now that we've got a match under our belt, I wanted to have a word about training.\n\nEach week, your players can be assigned a training focus \u2014 shooting, defending, pace, the lot. It's how they improve over time. Without it, they'll stay exactly where they are.\n\nYou can set it up on the Squad page, or if you'd rather focus on tactics and transfers, I'm happy to put everyone on a general programme for now. Your call.",
  type: "asst_mgr_training_intro",
  visibleFromIndex: 2,
  choices: [{ label: "You Handle It", value: "delegate" }, { label: "I'll Set It Up", value: "manual" }],
});

const trainingReport = (weekNum, body) => ({
  id: `msg_train_${Date.now()}`,
  icon: "\uD83C\uDFCB\uFE0F", // 🏋️
  color: "#a78bfa",
  title: `Training Report \u00B7 Week ${weekNum}`,
  body,
});

const lopsidedWarning = (body) => ({
  id: `msg_lopsided_${Date.now()}`,
  icon: "\uD83D\uDCCB", // 📋
  color: "#f59e0b",
  title: "Asst. Manager's Notes",
  body,
});

const trainingNudge = (introDeclined) => ({
  id: "msg_asst_mgr_training_nudge",
  icon: "\uD83D\uDCCB", // 📋
  color: "#f59e0b",
  title: "Asst. Manager's Notes",
  body: introDeclined
    ? "Boss, I know you said you'd handle training yourself, but we're 5 games in and none of the lads have a programme.\n\nAt this rate they won't improve at all this season. Want me to step in and put everyone on a general regime? You can always fine-tune it later."
    : "Boss, we're 5 matchdays in and the lads still aren't training.\n\nThey're not going to get any better on their own. Say the word and I'll put everyone on a general programme \u2014 you can always change it later on the Squad page.",
  type: "asst_mgr_training_nudge",
  choices: [{ label: "Go On Then", value: "delegate" }, { label: "Leave It", value: "dismiss" }],
});

const disciplinePenalty = (playerNames) => ({
  id: `card-skip-${Date.now()}`,
  type: "card_skip",
  icon: "\uD83E\uDD4B", // 🥋
  title: "Discipline Penalty",
  body: `${playerNames} missed training \u2014 indiscipline in the last match cost them a session.`,
  color: "#fb923c",
});

const doubleSessions = () => ({
  id: `msg_ticket_double_${Date.now()}`,
  icon: "\u26A1", // ⚡
  title: "Double Sessions Scheduled",
  body: "The gaffer has ordered double sessions this week. The lads aren't thrilled, but they'll thank you when the results come in. All training gains will be doubled for the next session.",
  color: C.gold,
});

// ---------------------------------------------------------------------------
// MATCH
// ---------------------------------------------------------------------------

const matchdayResults = (matchweekIndex, body) => ({
  id: `msg_md_${matchweekIndex}_${Date.now()}`,
  icon: "\uD83D\uDCCB", // 📋
  color: C.blue,
  title: `Matchday ${matchweekIndex + 1} Results`,
  body,
});

const cupRoundResult = (cupName, roundName, body) => ({
  id: `msg_cup_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  color: C.gold,
  title: `${cupName} \u00B7 ${roundName}`,
  body,
});

// ---------------------------------------------------------------------------
// SCOUT / TRIALS
// ---------------------------------------------------------------------------

const trialOffer = (player, trialWeek) => ({
  id: "msg_trial_" + player.id,
  week: trialWeek,
  icon: "\uD83C\uDF0D", // 🌍
  title: `Trial Suggested: ${player.name}`,
  body: `Your scout reports: "${player.name}, a ${player.age}-year-old ${player.position} from ${player.countryLabel} ${player.flag}, is over here on holiday and is showing promise. He's available for a 3-week trial if you have space in your squad."`,
  color: C.green,
  type: "trial_offer",
  trialPlayerData: player,
  visibleFromIndex: trialWeek - 1,
  choices: [{ label: "Accept Trial", value: "accept" }, { label: "Decline", value: "decline" }],
});

const trialDeclinedRival = (playerName, playerFlag, rivalName, trialAtWeek) => ({
  id: `msg_trial_followup_${Date.now()}`,
  week: trialAtWeek + 1,
  icon: "\uD83D\uDCF0", // 📰
  color: C.blue,
  title: `${playerName} On Trial at ${rivalName}`,
  body: `${playerName} ${playerFlag} has gone on trial at ${rivalName}. They're giving him the chance you didn't.`,
  visibleFromIndex: trialAtWeek,
});

const trialImpressed = (player) => ({
  id: `msg_trial_end_${Date.now()}`,
  week: player.week,
  season: player.season,
  icon: "\u2708\uFE0F", // ✈️
  color: C.blue,
  title: `${player.name} Trial Complete`,
  body: `${player.name} ${player.flag || ""} has headed home after an impressive trial \u2014 ${player.starts} appearance${player.starts !== 1 ? "s" : ""} in the first team. He'll continue developing abroad, but the door is open for a return.`,
});

const trialNoStarts = (playerName) => ({
  id: `msg_trial_end_${Date.now()}`,
  icon: "\uD83D\uDE14", // 😔
  color: C.textMuted,
  title: `${playerName} Trial Over`,
  body: `${playerName} has left without making an appearance. He didn't get the chance to show what he could do.`,
});

const trialRival = (playerName, playerFlag, rivalTeam, trialAtWeek) => ({
  id: `msg_trial_rival_${Date.now()}`,
  week: trialAtWeek,
  icon: "\uD83D\uDCF0", // 📰
  color: C.blue,
  title: `${playerName} On Trial at ${rivalTeam}`,
  body: `${playerName} ${playerFlag || ""} has gone on trial at ${rivalTeam}. They're giving him the chance he didn't get here.`,
  visibleFromIndex: trialAtWeek - 1,
});

const trialSignedRival = (playerName, playerFlag, rivalTeam) => ({
  id: `msg_trial_signed_${Date.now()}_${playerName}`,
  icon: "\uD83D\uDCF0", // 📰
  color: C.lightRed,
  title: `${playerName} Signs for ${rivalTeam}`,
  body: `${playerName} ${playerFlag || ""} has signed a permanent deal with ${rivalTeam} after impressing on trial there. One that got away?`,
});

const trialStar = (playerName, playerFlag, rivalTeam, posStr) => ({
  id: `msg_trial_star_${Date.now()}_${playerName}`,
  icon: "\u2B50", // ⭐
  color: C.amber,
  title: `${playerName} Is ${rivalTeam}'s Star Player`,
  body: `${playerName} ${playerFlag || ""} has been in sensational form for ${rivalTeam}, who finished ${posStr} last season. He could have been yours...`,
});

const trialSignedYouth = (playerName, playerFlag, teamName) => ({
  id: `msg_trial_signed_${Date.now()}_${playerName}`,
  icon: "\uD83C\uDF89", // 🎉
  color: C.green,
  title: `${playerName} Signed!`,
  body: `${playerName} ${playerFlag || ""} has impressed enough during his trial to earn a permanent deal. The fans are buzzing \u2014 they can't wait to see him in the ${teamName} shirt again. Welcome aboard, ${playerName.split(" ")[0]}!`,
});

// ---------------------------------------------------------------------------
// SEASON
// ---------------------------------------------------------------------------

const teamOfTheSeason = (body) => ({
  id: `msg_tots_${Date.now()}`,
  icon: "\u2B50", // ⭐
  color: C.amber,
  title: "Team of the Season",
  body,
});

const teamOfTheSeasonDetailed = (seasonNumber, body) => ({
  id: `msg_tots_s${seasonNumber}_${Date.now()}`,
  icon: "\uD83C\uDF1F", // 🌟
  color: C.gold,
  title: `Team of the Season \u00B7 S${seasonNumber}`,
  body,
});

const wellRested = (names) => ({
  id: `msg_well_rested_${Date.now()}`,
  icon: "\u2600\uFE0F", // ☀️
  color: "#f59e0b",
  title: "Players Return Refreshed",
  body: `Pre-season is underway. ${names} came back from the break in the best shape of their careers.`,
});

const seasonPreview = (body) => ({
  id: `msg_preview_${Date.now()}`,
  icon: "\uD83D\uDCCB", // 📋
  color: C.blue,
  title: "New Season Preview",
  body,
});

// ---------------------------------------------------------------------------
// ARCS
// ---------------------------------------------------------------------------

const arcComplete = (arcName, body) => ({
  id: `msg_arc_${arcName}_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  color: C.amber,
  title: `Arc Complete: ${arcName}`,
  body,
});

// ---------------------------------------------------------------------------
// LEAGUE
// ---------------------------------------------------------------------------

const leagueModIntro = (mod, leagueTier) => ({
  id: `msg_league_mod_${leagueTier}`,
  icon: mod.inboxIntro.icon,
  title: mod.inboxIntro.title,
  body: mod.inboxIntro.body,
  color: LEAGUE_DEFS[leagueTier]?.color || C.textMuted,
});

const leagueModIntroNewSeason = (mod, leagueTier, nextSeason) => ({
  id: `msg_league_mod_${leagueTier}_s${nextSeason}`,
  icon: mod.inboxIntro.icon,
  title: mod.inboxIntro.title,
  body: mod.inboxIntro.body,
  color: LEAGUE_DEFS[leagueTier]?.color || C.textMuted,
});

const leagueModIntroPrestige = (mod, tier) => ({
  id: `msg_league_intro_${Date.now()}`,
  icon: mod.inboxIntro.icon,
  title: mod.inboxIntro.title,
  body: mod.inboxIntro.body,
  color: LEAGUE_DEFS[tier]?.color || C.textMuted,
});

const reporterIntro = (reporterName, paperName, profileName) => ({
  id: "msg_reporter_intro",
  week: 2,
  icon: "\uD83D\uDCF0", // 📰
  color: "#94a3b8",
  title: `${reporterName}, ${paperName}`,
  body: `${profileName},\n\n${reporterName} here \u2014 I cover your club for ${paperName}. Thought I'd introduce myself now the season's underway.\n\nI've been doing this job long enough to know that the best clubs aren't just built on results. They're built on stories. The captain who drags the team through a crisis. The kid who comes from nowhere. The old pro who gets one last shot.\n\nYou'll find those threads developing in your Boot Room under Story Arcs. Keep an eye on them \u2014 the drama tends to write itself, and the payoff can be worth more than any training session.\n\nI'll be watching. Good luck.`,
  visibleFromIndex: 1,
});

const singleFixture = (tourneyName, matchdays, opponentNames, leagueTier) => ({
  id: `msg_single_fix_s1`,
  icon: "\uD83D\uDCCB", // 📋
  title: "Condensed Fixture List",
  body: `Due to the ${tourneyName} at the end of the season, the league has been compressed to ${matchdays} matchdays.\n\nYou'll only face ${opponentNames} once this season. Make it count.`,
  color: LEAGUE_DEFS[leagueTier]?.color || C.textMuted,
});

const singleFixtureNewSeason = (tourneyName, matchdays, opponentNames, leagueTier, nextSeason) => ({
  id: `msg_single_fix_s${nextSeason}`,
  icon: "\uD83D\uDCCB", // 📋
  title: "Condensed Fixture List",
  body: `Due to the ${tourneyName} at the end of the season, the league has been compressed to ${matchdays} matchdays.\n\nYou'll only face ${opponentNames} once this season. Make it count.`,
  color: LEAGUE_DEFS[leagueTier]?.color || C.textMuted,
});

// ---------------------------------------------------------------------------
// DYNASTY CUP
// ---------------------------------------------------------------------------

const dynastySFBg = (body) => ({
  id: `msg_dynasty_sf_bg_${Date.now()}`,
  icon: "\uD83C\uDF0D", // 🌍
  title: "Dynasty Cup \u2014 Semi-Finals",
  body,
  color: "#facc15",
});

const dynastyFinalBg = (body) => ({
  id: `msg_dynasty_final_bg_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "Dynasty Cup Final",
  body,
  color: "#facc15",
});

const dynastyDraw = (body) => ({
  id: `msg_dynasty_cup_${Date.now()}`,
  icon: "\uD83C\uDF0D", // 🌍
  title: "Dynasty Cup Draw",
  body,
  color: LEAGUE_DEFS[3]?.color || C.green, // will be overridden per-site
});

const dynastyDrawColor = (body, leagueTier) => ({
  id: `msg_dynasty_cup_${Date.now()}`,
  icon: "\uD83C\uDF0D", // 🌍
  title: "Dynasty Cup Draw",
  body,
  color: LEAGUE_DEFS[leagueTier]?.color || C.green,
});

const dynastySFPlayer = (body) => ({
  id: `msg_hol_dynasty_sf_${Date.now()}`,
  icon: "\uD83C\uDF0D", // 🌍
  title: "Dynasty Cup \u2014 Semi-Finals",
  body,
  color: "#facc15",
});

const dynastyWin = (motmName, attr, newVal) => ({
  id: `msg_dynasty_champ_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "Dynasty Cup Champions!",
  body: `You've won the Dynasty Cup! ${motmName} was named Man of the Match and earns a permanent +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)} boost (now ${newVal}).`,
  color: "#facc15",
});

const dynastyHolWin = (motmName, attr, newVal) => ({
  id: `msg_hol_dynasty_win_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "Dynasty Cup Champions!",
  body: `You've won the Dynasty Cup! ${motmName} earns +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)} (now ${newVal}).`,
  color: "#facc15",
});

const dynastyLoss = (body) => ({
  id: `msg_hol_dynasty_loss_${Date.now()}`,
  icon: "\uD83C\uDF0D", // 🌍
  title: "Dynasty Cup Final",
  body,
  color: "#facc15",
});

const dynastyFinalAI = (body) => ({
  id: `msg_hol_dynasty_ai_final_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "Dynasty Cup Final",
  body,
  color: "#facc15",
});

const dynastyOtherSF = (body) => ({
  id: `msg_dynasty_other_sf_${Date.now()}`,
  icon: "\uD83C\uDF0D", // 🌍
  title: "Dynasty Cup \u2014 Other Semi-Final",
  body,
  color: "#facc15",
});

const dynastyHolDraw = (body) => ({
  id: `msg_hol_dynasty_draw_${Date.now()}`,
  icon: "\uD83C\uDF0D", // 🌍
  title: "Dynasty Cup Draw",
  body,
  color: "#facc15",
});

// ---------------------------------------------------------------------------
// MINI-TOURNAMENT
// ---------------------------------------------------------------------------

const miniWin = (motmName, attr, newVal) => ({
  id: `msg_mini_champ_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "5v5 Mini-Tournament Champions!",
  body: `You've won the 5v5 Mini-Tournament! ${motmName} was named Man of the Match and earns a permanent +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)} boost (now ${newVal}).`,
  color: "#fbbf24",
});

const miniHolWin = (motmName, attr, newVal) => ({
  id: `msg_mini_hol_champ_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "5v5 Mini-Tournament Champions!",
  body: `You've won the 5v5 Mini-Tournament! ${motmName.name} earns +1 ${attr.charAt(0).toUpperCase() + attr.slice(1)} (now ${newVal}).`,
  color: "#fbbf24",
});

const miniSFLeg1 = (body) => ({
  id: `msg_mini_sf_l1_bg_${Date.now()}`,
  icon: "\uD83C\uDF10", // 🌐
  title: "Mini-Tournament \u2014 SF Leg 1",
  body,
  color: "#fbbf24",
});

const miniSFLeg2 = (body) => ({
  id: `msg_mini_sf_l2_bg_${Date.now()}`,
  icon: "\uD83C\uDF10", // 🌐
  title: "Mini-Tournament \u2014 SF Leg 2",
  body,
  color: "#fbbf24",
});

const mini3rd = (body) => ({
  id: `msg_mini_3rd_bg_${Date.now()}`,
  icon: "\uD83E\uDD49", // 🥉
  title: "Mini-Tournament \u2014 3rd-Place Playoff",
  body,
  color: "#fbbf24",
});

const miniFinal = (body) => ({
  id: `msg_mini_final_bg_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "Mini-Tournament Final",
  body,
  color: "#fbbf24",
});

const miniDraw = (body, leagueTier) => ({
  id: `msg_mini_tournament_${Date.now()}`,
  icon: "\uD83C\uDF10", // 🌐
  title: "5v5 Mini-Tournament Draw",
  body,
  color: LEAGUE_DEFS[leagueTier]?.color || C.gold,
});

const miniHolDraw = (body) => ({
  id: `msg_hol_mini_draw_${Date.now()}`,
  icon: "\uD83C\uDF10", // 🌐
  title: "5v5 Mini-Tournament Draw",
  body,
  color: "#fbbf24",
});

const miniOtherSF = (body) => ({
  id: `msg_mini_other_sf_${Date.now()}`,
  icon: "\uD83C\uDF10", // 🌐
  title: "Mini-Tournament \u2014 Semi-Finals Complete",
  body,
  color: "#fbbf24",
});

const miniSFLeg1Bg2 = (body) => ({
  id: `msg_mini_sf_l1_bg2_${Date.now()}`,
  icon: "\uD83C\uDF10", // 🌐
  title: "Mini-Tournament \u2014 SF Leg 1",
  body,
  color: "#fbbf24",
});

const miniSFLeg2Bg2 = (body) => ({
  id: `msg_mini_sf_l2_bg2_${Date.now()}`,
  icon: "\uD83C\uDF10", // 🌐
  title: "Mini-Tournament \u2014 SF Results",
  body,
  color: "#fbbf24",
});

const miniFinalBg2 = (body) => ({
  id: `msg_mini_final_bg2_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "Mini-Tournament Final",
  body,
  color: "#fbbf24",
});

const miniFinalResult = (body) => ({
  id: `msg_mini_final_bg2_${Date.now()}`,
  icon: "\uD83C\uDFC6", // 🏆
  title: "Mini-Tournament Final Result",
  body,
  color: "#fbbf24",
});

const mini3rdResult = (playerWon, mhg, mag) => ({
  id: `msg_mini_3rd_${Date.now()}`,
  icon: playerWon ? "\uD83E\uDD49" : "\uD83D\uDE1E", // 🥉 or 😞
  title: playerWon ? "3rd-Place Playoff \u2014 Victory!" : "3rd-Place Playoff \u2014 Defeat",
  body: playerWon
    ? `You won the 3rd-place playoff ${mhg}-${mag}! You've secured the final promotion spot.`
    : `You lost the 3rd-place playoff ${mhg}-${mag}. No promotion this season.`,
  color: "#fbbf24",
});

const miniIncomplete = (filled) => ({
  id: `msg_five_incomplete_${Date.now()}`,
  icon: "⚠️",
  title: "5v5 Squad Incomplete",
  body: `You need 5 players selected for the mini-tournament. You have ${filled}. Go to SQUAD to pick your 5.`,
  color: "#f97316",
});

// ---------------------------------------------------------------------------
// PRODIGAL SON
// ---------------------------------------------------------------------------

const prodigalScout = (name, formerClub, scoutWeek) => ({
  id: `msg_prodigal_scout_${Date.now()}`,
  week: scoutWeek,
  icon: "\uD83D\uDCCB", // 📋
  color: "#f59e0b",
  title: `Released Player: ${name}`,
  body: `Boss, ${name}'s been let go by ${formerClub}. Been training on his own since. The quality's obvious but his fitness has dropped right off. I've had a word with his agent \u2014 he's available if we want him.`,
  visibleFromIndex: scoutWeek - 1,
});

const prodigalOffer = (player, formerClub, offerWeek) => ({
  id: `msg_prodigal_offer_${Date.now()}`,
  week: offerWeek,
  icon: "\uD83D\uDCDD", // 📝
  color: "#f59e0b",
  title: `${player.name} \u2014 Decision Needed`,
  body: `${player.name} (${player.position}, 25) is willing to come in on reduced terms. He knows he has to earn his place. Do you want to bring him in?`,
  visibleFromIndex: offerWeek - 1,
  type: "prodigal_offer",
  prodigalPlayerData: player,
  choices: [{ label: "Sign Him", value: "accept" }, { label: "Pass", value: "decline" }],
});

const prodigalStart = (name) => ({
  id: `msg_prodigal_start_${Date.now()}`,
  icon: "\uD83D\uDCCB", // 📋
  color: C.textMuted,
  title: "Asst. Manager's Notes",
  body: `${name} looked rusty but didn't hide. The fitness will come.`,
});

const prodigalBenched = (name) => ({
  id: `msg_prodigal_bench_${Date.now()}`,
  icon: "\uD83D\uDCCB", // 📋
  color: C.textMuted,
  title: "Asst. Manager's Notes",
  body: `${name} hasn't said a word but you can see it in him. He needs games, boss.`,
});

const prodigalGoal = (name) => ({
  id: `msg_prodigal_goal_${Date.now()}`,
  icon: "\u26BD", // ⚽
  color: C.gold,
  title: `${name} Off the Mark`,
  body: `${name} was emotional after that one. A long time coming.`,
});

const prodigalFormerWin = (name, clubName) => ({
  id: `msg_prodigal_former_${Date.now()}`,
  icon: "\uD83E\uDD1D", // 🤝
  color: "#f59e0b",
  title: `${name} vs ${clubName}`,
  body: `${name} didn't celebrate. Shook hands with a few of their lads after the whistle. You could tell it meant everything.`,
});

const prodigalFormerLoss = (name, clubName) => ({
  id: `msg_prodigal_former_${Date.now()}`,
  icon: "\uD83E\uDD1D", // 🤝
  color: C.textMuted,
  title: `${name} vs ${clubName}`,
  body: `Tough afternoon for ${name} against his old lot. He'll dust himself off.`,
});

const prodigalTranscended = (name, clubName) => ({
  id: `msg_prodigal_transcended_${Date.now()}`,
  icon: "\uD83D\uDCF0", // 📰
  color: C.textMuted,
  title: `${clubName} Regretting`,
  body: `There are stories doing the rounds in the local press. Apparently ${clubName} have been watching ${name} closely from afar. A source close to their coaching staff admitted they hadn't expected him to develop like this. He never got the chance to silence them in person \u2014 but the numbers don't lie anymore.`,
});

const prodigalRedeemed = (name) => ({
  id: `msg_prodigal_redeemed_${Date.now()}`,
  icon: "\uD83C\uDFE0", // 🏠
  color: C.green,
  title: `${name} \u2014 Settled In`,
  body: `${name} pulled me aside after training. Said this is the happiest he's been in years. Whatever you've done for him, it's working. He looks like a different player. Expect a big step up in the next session.`,
});

// ---------------------------------------------------------------------------
// TICKETS
// ---------------------------------------------------------------------------

const retirementDelayed = (playerName) => ({
  id: `msg_ticket_retire_${Date.now()}`,
  icon: "\uD83C\uDFAB", // 🎫
  title: `${playerName} Reconsidering`,
  body: `After a heart-to-heart in the manager's office, ${playerName} has had a change of heart about hanging up the boots. "I've still got a lot to give this club," he told reporters. The retirement has been called off \u2014 for now.`,
  color: C.red,
});

const randomAttrBoost = (playerName, attrKey) => {
  const flavorLines = [
    `${playerName} was spotted putting in extra hours on the training ground this week. The coaching staff report a noticeable improvement in ${attrKey}.`,
    `Word from the dressing room is that ${playerName} has been working with a specialist coach. The results speak for themselves \u2014 a clear step up in ${attrKey}.`,
    `"Sometimes it just clicks," said ${playerName} after an intense personal session. His ${attrKey} has come on leaps and bounds.`,
  ];
  return {
    id: `msg_ticket_attr_${Date.now()}`,
    icon: "\uD83C\uDFB2", // 🎲
    title: `${playerName}: Training Note`,
    body: pickRandom(flavorLines),
    color: C.green,
  };
};

const relationBoost = (clubName) => {
  const flavorLines = [
    `Your chairman arranged a dinner with the ${clubName} board. "Productive talks," he said. Relations between the two clubs have strengthened significantly.`,
    `A friendly between the youth teams has helped smooth things over with ${clubName}. The back channels are open \u2014 expect warmer reception on future deals.`,
    `After lending ${clubName} some training facilities during their stadium renovation, the goodwill is flowing. Relations have taken a healthy step forward.`,
  ];
  return {
    id: `msg_ticket_relation_${Date.now()}`,
    icon: "\uD83E\uDD1D", // 🤝
    title: `${clubName}: Relations Improved`,
    body: pickRandom(flavorLines),
    color: C.blue,
  };
};

const miracleHealed = (playerName) => {
  const flavorLines = [
    `The club physio swears blind it's just Deep Heat and positive thinking, but whatever was in that bottle has worked wonders. ${playerName} reported for training this morning with a clean bill of health.`,
    `"I've never seen anything like it," said the physio, shaking his head. ${playerName} went from the treatment table to the training pitch in 24 hours flat. Miracle cream indeed.`,
    `${playerName} hobbled into the dressing room yesterday. Today? Sprinting like nothing happened. The medical staff are requesting more of whatever that was.`,
  ];
  return {
    id: `msg_ticket_cream_${Date.now()}`,
    icon: "\uD83E\uDDF4", // 🧴
    title: `${playerName}: Miracle Recovery`,
    body: pickRandom(flavorLines),
    color: "#22d3ee",
  };
};

const twelfthMan = (legendName, clubName) => {
  const flavorLines = [
    `EXCLUSIVE: ${legendName}, former ${clubName} captain, was spotted at the training ground this morning rallying the lads ahead of the next home game. "This club means everything to me," he told reporters. "I'll be in the stands, and I expect every seat filled." Ticket sales have gone through the roof.`,
    `${legendName} has issued a rallying cry to ${clubName} supporters ahead of the next home game. In a passionate open letter published in the club fanzine, the former fan favourite urged every supporter to turn up and make some noise. "The boys need us. Let's give them a home advantage they'll never forget."`,
    `The phone lines at ${clubName} have been ringing off the hook. ${legendName}, beloved former skipper, has been doing the rounds on local radio whipping up a frenzy ahead of the next home fixture. "I've still got my season ticket," he grinned. "And I'll be the loudest one there."`,
  ];
  return {
    id: `msg_ticket_12th_${Date.now()}`,
    icon: "\uD83D\uDCE3", // 📣
    title: `12th Man: ${legendName} Rallies The Fans`,
    body: pickRandom(flavorLines),
    color: "#f97316",
  };
};

const youthCoup = () => ({
  id: `msg_ticket_youthcoup_${Date.now()}`,
  icon: "\uD83C\uDF1F", // 🌟
  title: "Academy Director: Special Intel",
  body: "Your academy director has pulled some strings with his contacts abroad. \"Trust me, gaffer \u2014 the next intake will feature a real gem. I've seen this kid play and he's the real deal.\"",
  color: "#a78bfa",
});

const playerRenamed = (originalName, newName) => ({
  id: `msg_ticket_rename_${Date.now()}`,
  icon: "\uD83C\uDFF7\uFE0F", // 🏷️
  title: `${originalName}: New Shirt Name`,
  body: `${originalName} will now be known as "${newName}". The kit man has been up all night with the iron-on letters. The fans are already singing it.`,
  color: "#fb923c",
});

const transferInsider = (player, ovr) => ({
  id: `msg_ticket_insider_${Date.now()}`,
  icon: "\uD83D\uDD75\uFE0F", // 🕵️
  title: `Transfer Tip: ${player.name}`,
  body: `Your contacts have found a promising player available on a free transfer. ${player.name}, a ${player.age}-year-old ${player.position} (OVR ${ovr}), is looking for a new club. Act fast \u2014 other clubs are circling.`,
  color: "#34d399",
  type: "free_agent_offer",
  freeAgentData: player,
  choices: [{ label: "Sign Player", value: "accept" }, { label: "Pass", value: "decline" }],
});

const saudiAgent = (player, ovr) => ({
  id: `msg_saudi_agent_${Date.now()}`,
  icon: "\uD83D\uDD4C", // 🕌
  title: `Saudi Agent: ${player.name}`,
  body: `Your Saudi connections have delivered. ${player.name}, a ${player.age}-year-old ${player.position} (OVR ${ovr}), is available on a free transfer. Sign now \u2014 he won't wait.`,
  color: "#d4a017",
  type: "free_agent_offer",
  freeAgentData: player,
  choices: [{ label: "Sign Player", value: "accept" }, { label: "Pass", value: "decline" }],
});

const scoutDossier = (playerName, body) => ({
  id: `msg_ticket_scout_${Date.now()}`,
  icon: "\uD83D\uDD0D", // 🔍
  title: `Scouting Report: ${playerName}`,
  body,
  color: "#818cf8",
});

const testimonial = (legendName, apps) => ({
  id: `msg_ticket_testimonial_${Date.now()}`,
  icon: "\uD83C\uDFA9", // 🎩
  title: `${legendName}: One More Match`,
  body: `A familiar face is back! ${legendName} has agreed to lace up the boots one more time. "${apps || 0} appearances for this club \u2014 I couldn't say no." He's available for selection in the next match.`,
  color: "#f472b6",
});

const testimonialDone = (name) => ({
  id: `msg_testimonial_done_${Date.now()}`,
  icon: "\uD83C\uDFA9", // 🎩
  title: `${name}: Standing Ovation`,
  body: `The crowd gave ${name} a standing ovation as he walked off the pitch for the final time. Eyes glistening, he applauded every corner of the ground. A fitting farewell.`,
  color: "#f472b6",
});

// ---------------------------------------------------------------------------
// SPECIAL
// ---------------------------------------------------------------------------

const televisionBoost = (playerName, attrLabel, leagueTier) => ({
  id: `msg_tv_motm_${Date.now()}`,
  icon: "\uD83D\uDCFA", // 📺
  title: "Televised Match Boost",
  body: `That match was televised! ${playerName}'s Man of the Match performance earned a permanent +1 ${attrLabel}.`,
  color: LEAGUE_DEFS[leagueTier]?.color || C.green,
});

const televisionBoostHol = (playerName, attrLabel, leagueTier) => ({
  id: `msg_hol_tv_motm_${Date.now()}`,
  icon: "\uD83D\uDCFA", // 📺
  title: "Televised Match Boost",
  body: `That match was televised! ${playerName}'s Man of the Match performance earned a permanent +1 ${attrLabel}.`,
  color: LEAGUE_DEFS[leagueTier]?.color || C.green,
});

const aiPredictionCorrect = (homeScore, awayScore) => ({
  id: `msg_pred_correct_${Date.now()}`,
  icon: "\uD83D\uDEF8", // 🛸
  title: "AI Prediction Correct!",
  body: `The AI predicted ${homeScore}-${awayScore} and was right! The opposition steals the full 3 points from this fixture.`,
  color: "#a78bfa",
});

const aiPredictionCorrectHol = (homeScore, awayScore) => ({
  id: `msg_hol_pred_correct_${Date.now()}`,
  icon: "\uD83D\uDEF8", // 🛸
  title: "AI Prediction Correct!",
  body: `The AI predicted ${homeScore}-${awayScore} and was right! The opposition steals the full 3 points from this fixture.`,
  color: "#a78bfa",
});

const aiPredictionWrong = (predHome, predAway, actualHome, actualAway, playerLost) => ({
  id: `msg_pred_wrong_${Date.now()}`,
  icon: "\uD83D\uDEF8", // 🛸
  title: "AI Prediction Wrong",
  body: playerLost
    ? `The AI predicted ${predHome}-${predAway} but the result was ${actualHome}-${actualAway}. They got the 3 points the old-fashioned way.`
    : `The AI predicted ${predHome}-${predAway} but the result was ${actualHome}-${actualAway}. No points stolen.`,
  color: "#6b7280",
});

const rewindMatch = (oldLabel, oppName, newPGoals, newOGoals, wasDraw) => {
  const base = `You replayed your ${oldLabel} against ${oppName || "the opposition"}. New result: ${newPGoals}-${newOGoals}`;
  const newWon = newPGoals > newOGoals;
  const newDraw = newPGoals === newOGoals;
  const newLost = newOGoals > newPGoals;
  let suffix;
  if (newWon) suffix = " \u2014 the timeline has been corrected.";
  else if (wasDraw && newDraw) suffix = " \u2014 some timelines can't be rewritten.";
  else if (!wasDraw && newDraw) suffix = " \u2014 better, but not the rewrite you were hoping for.";
  else if (wasDraw && newLost) suffix = " \u2014 time doesn't like to be tampered with.";
  else suffix = " \u2014 the universe insists.";
  return {
    id: `msg_rewind_${Date.now()}`,
    icon: "\u23EA", // ⏪
    title: "Time Rewound!",
    body: base + suffix,
    color: "#a78bfa",
  };
};

const atkBlock = (minRequired, current) => ({
  id: `msg_atk_block_${Date.now()}`,
  icon: "\uD83C\uDFD4\uFE0F", // 🏔️
  title: "Board Directive: More Forwards Required",
  body: `The board insists on attacking football. You need at least ${minRequired} forwards (LW/RW/ST) in your starting XI. Currently: ${current}.`,
  color: C.red,
});

const poachEvent = (body, players, rivalIdx) => ({
  id: `msg_poach_${Date.now()}`,
  icon: "\uD83D\uDD4C", // 🕌
  title: "Mid-Season Poach Event",
  body,
  color: "#d4a017",
  type: "poach_event",
  poachPlayers: players,
  poachRivalIdx: rivalIdx,
  choices: [
    { label: `Sign ${players[0].name}`, value: "0" },
    { label: `Sign ${players[1].name}`, value: "1" },
    { label: `Sign ${players[2].name}`, value: "2" },
  ],
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const MSG = {
  // System
  welcome,
  boardExpectations,
  // Board
  boardReward,
  boardUltimatum,
  boardConcern,
  boardReprieve,
  fanRally,
  cupReprieve,
  // Training
  asstMgrTrainingIntro,
  trainingReport,
  lopsidedWarning,
  trainingNudge,
  disciplinePenalty,
  doubleSessions,
  // Match
  matchdayResults,
  cupRoundResult,
  // Scout / Trials
  trialOffer,
  trialDeclinedRival,
  trialImpressed,
  trialNoStarts,
  trialRival,
  trialSignedRival,
  trialStar,
  trialSignedYouth,
  // Season
  teamOfTheSeason,
  teamOfTheSeasonDetailed,
  wellRested,
  seasonPreview,
  // Arcs
  arcComplete,
  // League
  leagueModIntro,
  leagueModIntroNewSeason,
  leagueModIntroPrestige,
  reporterIntro,
  singleFixture,
  singleFixtureNewSeason,
  // Dynasty
  dynastySFBg,
  dynastyFinalBg,
  dynastyDraw,
  dynastyDrawColor,
  dynastySFPlayer,
  dynastyWin,
  dynastyHolWin,
  dynastyLoss,
  dynastyFinalAI,
  dynastyOtherSF,
  dynastyHolDraw,
  // Mini
  miniWin,
  miniHolWin,
  miniSFLeg1,
  miniSFLeg2,
  mini3rd,
  miniFinal,
  miniDraw,
  miniHolDraw,
  miniOtherSF,
  miniSFLeg1Bg2,
  miniSFLeg2Bg2,
  miniFinalBg2,
  miniFinalResult,
  mini3rdResult,
  miniIncomplete,
  // Prodigal
  prodigalScout,
  prodigalOffer,
  prodigalStart,
  prodigalBenched,
  prodigalGoal,
  prodigalFormerWin,
  prodigalFormerLoss,
  prodigalTranscended,
  prodigalRedeemed,
  // Tickets
  retirementDelayed,
  randomAttrBoost,
  relationBoost,
  miracleHealed,
  twelfthMan,
  youthCoup,
  playerRenamed,
  transferInsider,
  saudiAgent,
  scoutDossier,
  testimonial,
  testimonialDone,
  // Special
  televisionBoost,
  televisionBoostHol,
  aiPredictionCorrect,
  aiPredictionCorrectHol,
  aiPredictionWrong,
  rewindMatch,
  atkBlock,
  poachEvent,
  // Holiday
  holidaySummary: (body) => ({
    id: `msg_train_holiday_${Date.now()}`,
    icon: "\u2708\uFE0F", // ✈️
    title: "Holiday Training Summary",
    body,
    color: "#38bdf8",
    type: "holiday_summary",
  }),
  // Training cap
  statCapped: (playerName, cappedAttr, suggestedAttr, suggestedKey) => ({
    id: `msg_stat_cap_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    icon: "\uD83D\uDCC8", // 📈
    title: `${playerName}: Elite Level`,
    body: `Hey Boss, good news! ${playerName} has reached an elite level in ${cappedAttr} and now would benefit from focussing on other aspects of their game in training such as ${suggestedAttr}. Should I move them onto that or do you want to handle it yourself?`,
    color: "#4ade80",
    type: "stat_cap",
    choices: [{ label: "Go Ahead", value: "switch_training", data: { suggestedKey } }, { label: "I'll Handle It", value: "dismiss" }],
    _playerName: playerName,
  }),
  // Breakout
  breakout: (playerName, narrative, gainStr, potStr) => ({
    id: `msg_breakout_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    icon: "\uD83D\uDCA5", // 💥
    title: `BREAKOUT: ${playerName}`,
    body: `${playerName} ${narrative}!\n\n${gainStr}${potStr}`,
    color: "#facc15",
    type: "breakout",
  }),
};
