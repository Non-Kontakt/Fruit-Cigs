import { useCallback } from "react";
import { ATTRIBUTES } from "../data/training.js";
import { getOverall } from "../utils/calc.js";
import { generateFreeAgent, generateNameForNation } from "../utils/player.js";
import { useGameStore } from "../store/gameStore.js";
import { createInboxMessage } from "../utils/messageUtils.js";
import { MSG } from "../data/messages.js";

export function useTickets({
  squad, setSquad, retiringPlayers, setRetiringPlayers, seasonNumber, ovrCap,
  transferFocus, leagueTier, shortlist, clubHistory, teamName, clubRelationships, league, leagueResults,
  setTickets, setUsedTicketTypes, setInboxMessages, setClubRelationships,
  setDoubleTrainingWeek, setTwelfthManActive, setYouthCoupActive, setClubHistory,
  setTestimonialPlayer, setScoutedPlayers, setPendingFreeAgent, setPendingTicketBoosts,
}) {

  function seededPotential(playerId, age) {
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = ((hash << 5) - hash) + playerId.charCodeAt(i); hash |= 0;
    }
    const seed = Math.abs(hash) / 2147483647;
    const basePot = ovrCap - (Math.max(0, age - 17) * 0.5);
    return Math.max(6, Math.min(ovrCap, Math.round(basePot + (seed * 6) - 3)));
  }

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
    const attr = boostable[Math.floor(Math.random() * boostable.length)];
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
    const club = transferFocus[Math.floor(Math.random() * transferFocus.length)];
    setClubRelationships(prev => {
      const entry = prev[club] || { pct: 0, tier: leagueTier };
      return { ...prev, [club]: { ...entry, pct: Math.min(100, entry.pct + 20) } };
    });
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "relations_boost"]));
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
      const { name } = generateNameForNation("EN");
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
    const agent = generateFreeAgent(leagueTier, avgOvr, ovrCap);
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
    const potential = sp.potential ?? Math.max(sp.ovr, seededPotential(playerId, sp.age));
    const currentOvr = sp.ovr || 0;
    const actualPot = Math.max(potential, currentOvr);
    setScoutedPlayers(prev => ({ ...prev, [playerId]: actualPot }));
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
  }, [shortlist, seasonNumber, ovrCap, league, leagueResults]);

  const useTicketTestimonialMatch = useCallback((ticketId, careerName) => {
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
    const agent = generateFreeAgent(leagueTier, avgOvr, ovrCap);
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
