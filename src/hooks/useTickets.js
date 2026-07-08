import { useCallback } from "react";
import { ATTRIBUTES } from "../data/training.js";
import { getOverall, pickRandom } from "../utils/calc.js";
import { generateFreeAgent, generateNameForNation } from "../utils/player.js";
import { useGameStore } from "../store/gameStore.js";
import { createInboxMessage } from "../utils/messageUtils.js";
import { fallbackPotential, countRevealedPlayers, isWastedTrip } from "../utils/scouting.js";
import { MSG } from "../data/messages.js";

export function useTickets({
  squad, setSquad, retiringPlayers, setRetiringPlayers, seasonNumber, ovrCap,
  transferFocus, leagueTier, shortlist, clubHistory, teamName, clubRelationships, league, leagueResults,
  setTickets, setUsedTicketTypes, setInboxMessages, setClubRelationships,
  setDoubleTrainingWeek, setTwelfthManActive, setYouthCoupActive, setClubHistory,
  setTestimonialPlayer, setScoutedPlayers, setPendingFreeAgent, setPendingTicketBoosts,
  setScoutRevealMeta, setDossierBurns,
  unlockedAchievements, tryUnlockAchievement,
}) {

  const useTicketDelayRetirement = useCallback((ticketId, playerId) => {
    const player = squad.find(p => p.id === playerId);
    if (!player || !retiringPlayers.has(playerId)) return;
    setRetiringPlayers(prev => { const n = new Set(prev); n.delete(playerId); return n; });
    setSquad(prev => prev.map(p => p.id !== playerId ? p : { ...p, delayedRetirement: true }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "delay_retirement"]));
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.retirementDelayed(player.name),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [squad, retiringPlayers, seasonNumber]);

  const useTicketRandomAttr = useCallback((ticketId, playerId) => {
    const player = squad.find(p => p.id === playerId);
    if (!player) return;
    const boostable = ATTRIBUTES.filter(a => player.attrs[a.key] < ovrCap);
    if (!boostable.length) return;
    const attr = pickRandom(boostable);
    const oldVal = player.attrs[attr.key];
    const newVal = oldVal + 1;
    setSquad(prev => prev.map(p => {
      if (p.id !== playerId) return p;
      return { ...p, attrs: { ...p.attrs, [attr.key]: newVal }, gains: { ...(p.gains || {}), [attr.key]: (p.gains?.[attr.key] || 0) + 1 } };
    }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "random_attr"]));
    setPendingTicketBoosts(prev => [...prev, {
      playerId: player.id, playerName: player.name, playerPosition: player.position,
      attr: attr.key, oldVal, newVal,
    }]);
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.randomAttrBoost(player.name, attr.key),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [squad, seasonNumber]);

  const useTicketRelationBoost = useCallback((ticketId) => {
    if (transferFocus.length === 0) return;
    const rels = useGameStore.getState().clubRelationships;
    // Always boost the focus team with the lower relationship %
    const sorted = [...transferFocus].sort((a, b) => (rels[a]?.pct || 0) - (rels[b]?.pct || 0));
    const club = sorted[0];
    setClubRelationships(prev => {
      const entry = prev[club] || { pct: 0, tier: leagueTier };
      return { ...prev, [club]: { ...entry, pct: Math.min(100, entry.pct + 20) } };
    });
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "relation_boost"]));
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.relationBoost(club),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [transferFocus, leagueTier, seasonNumber]);

  const useTicketDoubleSession = useCallback((ticketId) => {
    setDoubleTrainingWeek(true);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "double_session"]));
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.doubleSessions(),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [seasonNumber]);

  const useTicketMiracleCream = useCallback((ticketId, playerId) => {
    const player = squad.find(p => p.id === playerId);
    if (!player || !player.injury) return;
    setSquad(prev => prev.map(p => p.id !== playerId ? p : { ...p, injury: null, miracleHealed: true }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "miracle_cream"]));
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.miracleHealed(player.name),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [squad, seasonNumber]);

  const useTicketTwelfthMan = useCallback((ticketId) => {
    setTwelfthManActive(true);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "twelfth_man"]));
    // Persistent club ambassador — generated once, stored in clubHistory
    let legendName = clubHistory.clubAmbassador;
    if (!legendName) {
      const { name } = generateNameForNation("ENG");
      legendName = name;
      setClubHistory(prev => ({ ...prev, clubAmbassador: name }));
    }
    const club = teamName || "the club";
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.twelfthMan(legendName, club),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [seasonNumber, teamName, clubHistory.clubAmbassador]);

  const useTicketYouthCoup = useCallback((ticketId) => {
    setYouthCoupActive(true);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "youth_coup"]));
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.youthCoup(),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [seasonNumber]);

  const useTicketRenamePlayer = useCallback((ticketId, playerId, newName) => {
    const player = squad.find(p => p.id === playerId);
    if (!player || !newName?.trim()) return;
    const trimmed = newName.trim().slice(0, 20);
    const originalName = player.birthName || player.name;
    setSquad(prev => prev.map(p => p.id !== playerId ? p : { ...p, name: trimmed, birthName: originalName }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "rename_player"]));
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.playerRenamed(originalName, trimmed),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [squad, seasonNumber]);

  const useTicketTransferInsider = useCallback((ticketId) => {
    const currentSquad = useGameStore.getState().squad;
    const avgOvr = Math.round(currentSquad.reduce((s, p) => s + getOverall(p), 0) / currentSquad.length);
    const agent = generateFreeAgent(leagueTier, avgOvr, ovrCap, new Set(currentSquad.map(p => p.name)));
    setPendingFreeAgent(agent);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "transfer_insider"]));
    const ovr = getOverall(agent);
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.transferInsider(agent, ovr),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [leagueTier, seasonNumber]);

  const useTicketScoutDossier = useCallback((ticketId, playerId) => {
    const sp = shortlist.find(p => p.id === playerId);
    if (!sp) return;
    // Use real potential if stored, otherwise derive from current OVR
    const potential = sp.potential ?? fallbackPotential(sp, ovrCap);
    const currentOvr = sp.ovr || 0;
    const actualPot = Math.max(potential, currentOvr);
    setScoutedPlayers(prev => {
      const next = { ...prev, [playerId]: actualPot };
      // Card Index — revealed the potential of ten different players
      if (tryUnlockAchievement && !unlockedAchievements?.has?.("card_index") && countRevealedPlayers(next) >= 10) {
        tryUnlockAchievement("card_index");
      }
      return next;
    });
    // Strike While It's Hot — remember this reveal happened via the dossier
    // (not the passive timer), and when.
    const dossierWeek = useGameStore.getState().calendarIndex;
    setScoutRevealMeta(prev => ({ ...prev, [playerId]: { week: dossierWeek, method: "dossier" } }));
    // Just Browsing — record the burn, resolved at season end if he's never signed.
    setDossierBurns(prev => ({ ...prev, [playerId]: { season: seasonNumber } }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "scout_dossier"]));

    const lines = [];

    // Ceiling — hidden info, the main draw of the dossier
    const headroom = actualPot - currentOvr;
    if (headroom > 0) {
      lines.push(`Ceiling: ${actualPot}/${ovrCap} — ${headroom} points of growth still in him.`);
    } else {
      lines.push(`Ceiling: ${actualPot}/${ovrCap} — what you see is what you get. Fully developed.`);
    }
    // Wasted Trip — revealed a potential no higher than current ability
    if (tryUnlockAchievement && !unlockedAchievements?.has?.("wasted_trip") && isWastedTrip(actualPot, currentOvr)) {
      tryUnlockAchievement("wasted_trip");
    }

    // Season form — G/A tallied from leagueResults (hidden, nobody tracks this manually)
    let goals = 0, assists = 0, apps = 0;
    if (leagueResults && sp.name) {
      Object.values(leagueResults).forEach(matchweek => {
        if (!Array.isArray(matchweek)) return;
        matchweek.forEach(result => {
          // Check if this player's team was involved
          const teamIdx = league?.teams?.findIndex(t => t.name === sp.clubName);
          if (teamIdx == null || (result.home !== teamIdx && result.away !== teamIdx)) return;
          apps++;
          (result.goalScorers || []).forEach(gs => {
            if (gs.name === sp.name) goals++;
            if (gs.assister === sp.name) assists++;
          });
        });
      });
    }
    if (apps > 0) {
      const formParts = [];
      if (goals > 0 || assists > 0) {
        formParts.push(`${goals}G ${assists}A in ${apps} appearances this season`);
      } else {
        formParts.push(`${apps} appearances this season, no goal contributions`);
      }
      lines.push(`Form: ${formParts.join(". ")}.`);
    }

    // Hidden weaknesses — find attrs significantly below their best
    if (sp.attrs) {
      const attrEntries = ATTRIBUTES.map(a => ({ key: a.key, label: a.label, val: sp.attrs[a.key] || 0 }));
      const max = Math.max(...attrEntries.map(a => a.val));
      const weaknesses = attrEntries.filter(a => a.val <= max - 4);
      if (weaknesses.length > 0) {
        lines.push(`Exploitable weakness: ${weaknesses.map(w => `${w.label} (${w.val})`).join(", ")}.`);
      } else {
        lines.push("No major weaknesses in his game. Well-rounded profile.");
      }
    }

    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.scoutDossier(sp.name, lines.join("\n")),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [shortlist, seasonNumber, ovrCap, league, leagueResults, unlockedAchievements, tryUnlockAchievement]);

  const useTicketTestimonialMatch = useCallback((ticketId, careerName) => {
    // `careerName` here is the canonical playerCareers key passed straight
    // from AchievementCabinet's Object.entries(clubHistory.playerCareers)
    // iteration, so this is identity-correct without a findCareerKey lookup.
    const career = clubHistory?.playerCareers?.[careerName];
    if (!career?.retiredAttrs) return;
    const degradedAttrs = {};
    Object.entries(career.retiredAttrs).forEach(([key, val]) => {
      degradedAttrs[key] = Math.max(1, Math.round(val * 0.8));
    });
    const seasonsSinceRetirement = seasonNumber - (career.retiredSeason || seasonNumber);
    const tempPlayer = {
      id: `testimonial_${Date.now()}`,
      name: careerName,
      position: career.retiredPosition,
      age: (career.retiredAge || 33) + seasonsSinceRetirement,
      attrs: degradedAttrs,
      potential: 0,
      nationality: career.retiredNationality,
      statProgress: {}, training: null, gains: {}, history: [degradedAttrs],
      injury: null, tags: ["legend"], injuryHistory: {},
      isTestimonial: true,
      seasonStartOvr: getOverall({ attrs: degradedAttrs, position: career.retiredPosition }),
      seasonStartAttrs: { ...degradedAttrs },
    };
    setTestimonialPlayer(tempPlayer);
    setSquad(prev => [...prev, tempPlayer]);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "testimonial_match"]));
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.testimonial(careerName, career.apps),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [clubHistory, seasonNumber]);

  const useTicketSaudiAgent = useCallback((ticketId) => {
    const currentSquad = useGameStore.getState().squad;
    const avgOvr = Math.round(currentSquad.reduce((s, p) => s + getOverall(p), 0) / currentSquad.length);
    const agent = generateFreeAgent(leagueTier, avgOvr, ovrCap, new Set(currentSquad.map(p => p.name)));
    setPendingFreeAgent(agent);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "saudi_agent"]));
    const ovr = getOverall(agent);
    setInboxMessages(prev => [...prev, createInboxMessage(
      MSG.saudiAgent(agent, ovr),
      { calendarIndex: useGameStore.getState().calendarIndex, seasonNumber },
    )]);
  }, [leagueTier, seasonNumber]);

  return {
    useTicketDelayRetirement,
    useTicketRandomAttr,
    useTicketRelationBoost,
    useTicketDoubleSession,
    useTicketMiracleCream,
    useTicketTwelfthMan,
    useTicketYouthCoup,
    useTicketRenamePlayer,
    useTicketTransferInsider,
    useTicketScoutDossier,
    useTicketTestimonialMatch,
    useTicketSaudiAgent,
  };
}
