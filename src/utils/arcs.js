import { ARC_CATS, STORY_ARCS, ARC_NARRATIVES } from "../data/storyArcs.js";
import { ATTRIBUTES, TRAINING_FOCUSES } from "../data/training.js";
import { POSITION_TYPES } from "../data/positions.js";
import { getOverall } from "./calc.js";

export function getArcById(id) { return STORY_ARCS.find(a => a.id === id); }
export function getArcsForCat(cat) { return STORY_ARCS.filter(a => a.cat === cat); }

export function getValidTargets(arcId, squad) {
  const arc = getArcById(arcId);
  if (!arc?.targetFilter) return [];
  return squad.filter(p => {
    if (!p || p.isTrial) return false;
    switch(arc.targetFilter) {
      case "ovr_lte_8": return getOverall(p) <= 8;
      case "age_gte_28": return p.age >= 28;
      case "mental_gte_15": return (p.attrs?.mental || 0) >= 15;
      case "age_lte_19": return p.age <= 19;
      default: return false;
    }
  });
}

export function checkArcCond(step, tracking, gs) {
  const { squad, league, prodigalSon, trialPlayer, trialHistory, leagueTier,
          consecutiveWins, halfwayPosition, cup } = gs;
  const target = tracking?.targetId ? squad.find(p => p.id === tracking.targetId) : null;
  const c = step.cond, v = step.val, cnt = step.count;
  switch(c) {
    case "target_ovr": return target && getOverall(target) >= v;
    case "target_age": return target && target.age >= v;
    case "target_apps": return (tracking?.apps || 0) >= v;
    case "target_starts": return (tracking?.starts || 0) >= v;
    case "target_wins": return (tracking?.winsWithTarget || 0) >= v;
    case "target_motm": return (tracking?.motmCount || 0) >= v;
    case "home_win_streak": return (tracking?.homeWinStreak || 0) >= v;
    case "home_clean_sheets": return (tracking?.homeCleanSheets || 0) >= v;
    case "season_unbeaten_home": return !!tracking?.seasonEnded && !tracking?.homeLost;
    case "beat_above": return !!tracking?.beatAbove;
    case "beat_leaders": return !!tracking?.beatLeaders;
    case "beat_higher_cup": return !!tracking?.beatHigherCup;
    case "consec_wins": return consecutiveWins >= v;
    case "trial_accepted": return !!trialPlayer || !!tracking?.trialAccepted;
    case "trial_win": return !!tracking?.trialWin;
    case "trial_recruited": return !!tracking?.trialRecruited;
    case "promoted_to": return leagueTier <= v;
    case "top3_halfway": return halfwayPosition != null && halfwayPosition <= 3;
    case "cup_semi": {
      if (!cup?.rounds) return false;
      const rKeys = Object.keys(cup.rounds).map(Number).sort((a,b)=>a-b);
      if (rKeys.length < 2 || cup.playerEliminated) return false;
      const semiIdx = rKeys[rKeys.length - 2];
      const semi = cup.rounds[semiIdx];
      return semi?.matches?.some(m => m.home?.isPlayer || m.away?.isPlayer) || false;
    }
    case "the_double": return !!tracking?.wonDouble;
    case "released_player": return !!tracking?.releasedPlayer;
    case "prodigal_accepted": return prodigalSon?.phase === "active" || prodigalSon?.phase === "redeemed";
    case "prodigal_redeemed": return prodigalSon?.phase === "redeemed";
    case "any_ovr": return squad.some(p => !p.isTrial && getOverall(p) >= v);
    case "count_ovr": return squad.filter(p => !p.isTrial && getOverall(p) >= v).length >= cnt;
    case "won_league": return !!tracking?.wonLeague;
    default: return false;
  }
}

export function applyArcFx(fx, squad, targetId, prodigalSonId, bonuses, ovrCap = 20) {
  let newSquad = squad.map(p => ({...p, attrs:{...p.attrs}, gains:{...(p.gains||{})}}));
  const newBonuses = {...bonuses};
  const ATR_KEYS = ATTRIBUTES.map(a => a.key);
  const boost = (p, stat, amt) => { p.attrs[stat] = Math.min(p.legendCap || ovrCap, (p.attrs[stat]||0) + amt); };

  if (fx.target || fx.prodigal) {
    const tid = fx.prodigal ? prodigalSonId : targetId;
    const p = newSquad.find(pp => pp.id === tid);
    if (p) {
      if (fx.stats) Object.entries(fx.stats).forEach(([k,v]) => boost(p, k, v));
      if (fx.mode === "highest") { const best = ATR_KEYS.reduce((a,b) => (p.attrs[a]||0)>=(p.attrs[b]||0)?a:b); boost(p, best, fx.amt); }
      if (fx.mode === "lowest3") { const sorted = [...ATR_KEYS].sort((a,b) => (p.attrs[a]||0)-(p.attrs[b]||0)); sorted.slice(0,3).forEach(k => boost(p, k, fx.amt)); }
      if (fx.mode === "trained") { const tk = p.training && TRAINING_FOCUSES.find(f=>f.key===p.training)?.attrs?.[0]; if(tk) boost(p, tk, fx.amt); else { const best = ATR_KEYS.reduce((a,b) => (p.attrs[a]||0)>=(p.attrs[b]||0)?a:b); boost(p, best, fx.amt); } }
      if (fx.mode === "all") ATR_KEYS.forEach(k => boost(p, k, fx.amt));
      if (fx.mode === "random3") { const shuffled = [...ATR_KEYS].sort(()=>Math.random()-0.5); shuffled.slice(0,3).forEach(k => boost(p, k, fx.amt)); }
      if (fx.mode === "random12") { const shuffled = [...ATR_KEYS].sort(()=>Math.random()-0.5); boost(p, shuffled[0], fx.amts[0]); boost(p, shuffled[1], fx.amts[1]); }
    }
  }
  if (fx.squad) {
    const targets = fx.filter ? newSquad.filter(p => POSITION_TYPES[p.position] === fx.filter) : newSquad;
    targets.forEach(p => {
      if (fx.stats) Object.entries(fx.stats).forEach(([k,v]) => boost(p, k, v));
      if (fx.mode === "all") ATR_KEYS.forEach(k => boost(p, k, fx.amt));
    });
  }
  if (fx.top3) {
    const sorted = [...newSquad].sort((a,b) => getOverall(b)-getOverall(a)).slice(0,3);
    sorted.forEach(p => {
      const pp = newSquad.find(q => q.id === p.id);
      if (fx.mode === "primary") { const tk = pp.training && TRAINING_FOCUSES.find(f=>f.key===pp.training)?.attrs?.[0]; if(tk) boost(pp,tk,fx.amt); else boost(pp, ATR_KEYS.reduce((a,b)=>(pp.attrs[a]||0)>=(pp.attrs[b]||0)?a:b), fx.amt); }
      if (fx.mode === "random") { const rk = ATR_KEYS[Math.floor(Math.random()*ATR_KEYS.length)]; boost(pp, rk, fx.amt); }
    });
  }
  if (fx.bonus) Object.entries(fx.bonus).forEach(([k,v]) => { newBonuses[k] = (newBonuses[k]||0) + v; });
  return { squad: newSquad, bonuses: newBonuses };
}

export function applyFinalReward(arc, squad, targetId, prodigalSonId, bonuses, ovrCap = 20) {
  const fx = arc.finalFx;
  let newSquad = squad.map(p => ({...p, attrs:{...p.attrs}, tags:[...(p.tags||[])]}));
  const newBonuses = {...bonuses};
  const ATR_KEYS = ATTRIBUTES.map(a => a.key);
  const boost = (p, stat, amt) => { p.attrs[stat] = Math.min(p.legendCap || ovrCap, (p.attrs[stat]||0) + amt); };

  if (fx.tag) {
    const p = newSquad.find(pp => pp.id === targetId);
    if (p && !p.tags?.includes(fx.tag)) p.tags.push(fx.tag);
  }
  if (fx.targetWeakest) {
    const p = newSquad.find(pp => pp.id === targetId);
    if (p) { const weakest = ATR_KEYS.reduce((a,b) => (p.attrs[a]||0)<=(p.attrs[b]||0)?a:b); boost(p, weakest, fx.targetWeakest); }
  }
  if (fx.squadStats) {
    const targets = fx.filter ? newSquad.filter(p => POSITION_TYPES[p.position] === fx.filter) : newSquad;
    targets.forEach(p => Object.entries(fx.squadStats).forEach(([k,v]) => boost(p, k, v)));
  }
  if (fx.squadAll) newSquad.forEach(p => ATR_KEYS.forEach(k => boost(p, k, fx.squadAll)));
  if (fx.bonus) Object.entries(fx.bonus).forEach(([k,v]) => { newBonuses[k] = (newBonuses[k]||0) + v; });
  if (fx.prodigalBoost) {
    const p = newSquad.find(pp => pp.id === prodigalSonId);
    if (p) { boost(p,"pace",4); boost(p,"physical",3); }
  }
  return { squad: newSquad, bonuses: newBonuses };
}

export function processArcCompletion(arc, catState, currentCompleted, currentBonuses, context) {
  const { unlockedAchievements, seasonNumber, week } = context;
  const bonuses = {...(currentBonuses || {})};
  if (arc.finalFx.bonus) {
    Object.entries(arc.finalFx.bonus).forEach(([k,v]) => { bonuses[k] = (bonuses[k]||0) + v; });
  }
  const completed = [...(currentCompleted || []), arc.id];
  const achievements = [];
  if (completed.length === 1 && !unlockedAchievements.has("plot_armour")) achievements.push("plot_armour");
  if (!unlockedAchievements.has("speedrun") && catState.startWeek != null) {
    const elapsed = ((seasonNumber || 1) - (catState.startSeason || 1)) * 30 + ((week || 0) - (catState.startWeek || 0));
    if (elapsed <= 10) achievements.push("speedrun");
  }
  if (arc.id === "captain_fantastic" && !unlockedAchievements.has("the_gaffer")) achievements.push("the_gaffer");
  if (!unlockedAchievements.has("trilogy")) {
    const doneCats = new Set(completed.map(id => getArcById(id)?.cat).filter(Boolean));
    if (doneCats.has("player") && doneCats.has("club") && doneCats.has("legacy")) achievements.push("trilogy");
  }
  if (completed.length >= 6 && !unlockedAchievements.has("box_set")) achievements.push("box_set");
  if (completed.length >= 12 && !unlockedAchievements.has("completionist")) achievements.push("completionist");
  return { bonuses, completed, achievements };
}

export function precomputeArcEffects(arcSnap, gameState, prodigalSon) {
  let pendingFocusFx = null;
  let pendingFinalRewards = null;

  ARC_CATS.forEach(cat => {
    const cs = arcSnap[cat];
    if (!cs || cs.completed) return;
    const arc = getArcById(cs.arcId);
    if (!arc) return;
    let simStep = cs.step;

    if (cs.focus && cs.focus.weeksLeft - 1 <= 0) {
      const step = arc.steps[simStep];
      const opt = step?.[cs.focus.choice];
      if (opt?.fx) {
        pendingFocusFx = { fx: opt.fx, targetId: cs.tracking?.targetId, prodigalId: prodigalSon?.playerId };
      }
      simStep++;
    }

    if (simStep >= arc.steps.length) {
      if (!pendingFinalRewards) pendingFinalRewards = [];
      pendingFinalRewards.push({ arc, targetId: cs.tracking?.targetId, prodigalId: prodigalSon?.playerId });
      return;
    }

    const condStep = arc.steps[simStep];
    if (condStep?.t === "cond" && checkArcCond(condStep, cs.tracking, gameState)) {
      simStep++;
      if (simStep >= arc.steps.length) {
        if (!pendingFinalRewards) pendingFinalRewards = [];
        pendingFinalRewards.push({ arc, targetId: cs.tracking?.targetId, prodigalId: prodigalSon?.playerId });
      }
    }
  });

  const applied = arcSnap.rewardsApplied || [];
  const queued = new Set((pendingFinalRewards || []).map(r => r.arc.id));
  ["player", "club", "legacy"].forEach(cat => {
    const cs = arcSnap[cat];
    if (cs?.completed && cs?.arcId && !applied.includes(cs.arcId) && !queued.has(cs.arcId)) {
      const arc = getArcById(cs.arcId);
      if (arc) {
        if (!pendingFinalRewards) pendingFinalRewards = [];
        pendingFinalRewards.push({ arc, targetId: cs.tracking?.targetId || null, prodigalId: prodigalSon?.playerId || null });
      }
    }
  });
  (arcSnap.completed || []).forEach(id => {
    if (!applied.includes(id) && !queued.has(id) && !(pendingFinalRewards || []).some(r => r.arc.id === id)) {
      const arc = getArcById(id);
      if (arc) {
        if (!pendingFinalRewards) pendingFinalRewards = [];
        pendingFinalRewards.push({ arc, targetId: null, prodigalId: null });
      }
    }
  });

  return { pendingFocusFx, pendingFinalRewards };
}

export function initStoryArcs() {
  return { player:null, club:null, legacy:null, completed:[], bonuses:{} };
}

// At season end, set tracking flags and auto-complete in-progress focus steps
// so final conditions (e.g. "the_double") can be evaluated by the existing
// arc condition machinery (triggerSeasonEnd / next advanceWeek).
// Focus stat effects are forfeited — the arc's final reward compensates.
export function resolveSeasonEndArcs(arcsState, position, cupWon) {
  const next = {...arcsState};

  // 1. Set tracking flags
  ARC_CATS.forEach(cat => {
    const cs = next[cat];
    if (!cs || cs.completed) return;
    const t = {...(cs.tracking || {})};
    if (position === 1) t.wonLeague = true;
    if (position === 1 && cupWon) t.wonDouble = true;
    t.seasonEnded = true;
    next[cat] = {...cs, tracking: t};
  });

  // 2. Auto-complete in-progress focus steps so final conditions can be evaluated
  ARC_CATS.forEach(cat => {
    const cs = next[cat];
    if (!cs || cs.completed || !cs.focus) return;
    const arc = getArcById(cs.arcId);
    if (!arc) return;
    next[cat] = {...next[cat], step: next[cat].step + 1, focus: null};
  });

  return next;
}

export function getStepNarrative(arcId, stepIdx, tracking, squad) {
  const narratives = ARC_NARRATIVES[arcId];
  if (!narratives || !narratives[stepIdx]) return null;
  let text = narratives[stepIdx];
  const target = tracking?.targetId ? squad?.find(p => p.id === tracking.targetId) : null;
  if (target) {
    text = text.replace(/{target}/g, target.name);
    text = text.replace(/{age}/g, target.age);
  }
  text = text.replace(/{apps}/g, tracking?.apps || 0);
  return text;
}

export function getFocusNarrative(arcId, choice, optName) {
  return `${optName} complete. The gains are already showing on the training pitch.`;
}
