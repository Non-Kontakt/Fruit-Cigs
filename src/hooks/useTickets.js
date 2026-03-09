import { useCallback } from "react";
import { ATTRIBUTES } from "../data/training.js";
import { C } from "../data/tokens";
import { getOverall } from "../utils/calc.js";
import { generateFreeAgent, generateNameForNation } from "../utils/player.js";
import { useGameStore } from "../store/gameStore.js";

export function useTickets({
  squad, setSquad, retiringPlayers, setRetiringPlayers, seasonNumber, ovrCap,
  transferFocus, leagueTier, shortlist, clubHistory, teamName, clubRelationships, league, leagueResults,
  setTickets, setUsedTicketTypes, setInboxMessages, setClubRelationships,
  setDoubleTrainingWeek, setTwelfthManActive, setYouthCoupActive, setClubHistory,
  setTestimonialPlayer, setScoutedPlayers, setPendingFreeAgent, setPendingTicketBoosts,
  calendarIndexRef,
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
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_retire_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83C\uDFAB", title: `${player.name} Reconsidering`,
      body: `After a heart-to-heart in the manager's office, ${player.name} has had a change of heart about hanging up the boots. "I've still got a lot to give this club," he told reporters. The retirement has been called off \u2014 for now.`,
      color: C.red, read: false,
    }]);
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
    const flavorLines = [
      `${player.name} was spotted putting in extra hours on the training ground this week. The coaching staff report a noticeable improvement in ${attr.key}.`,
      `Word from the dressing room is that ${player.name} has been working with a specialist coach. The results speak for themselves \u2014 a clear step up in ${attr.key}.`,
      `"Sometimes it just clicks," said ${player.name} after an intense personal session. His ${attr.key} has come on leaps and bounds.`,
    ];
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_attr_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83C\uDFB2", title: `${player.name}: Training Note`,
      body: flavorLines[Math.floor(Math.random() * flavorLines.length)],
      color: C.green, read: false,
    }]);
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
    const flavorLines = [
      `Your chairman arranged a dinner with the ${club} board. "Productive talks," he said. Relations between the two clubs have strengthened significantly.`,
      `A friendly between the youth teams has helped smooth things over with ${club}. The back channels are open \u2014 expect warmer reception on future deals.`,
      `After lending ${club} some training facilities during their stadium renovation, the goodwill is flowing. Relations have taken a healthy step forward.`,
    ];
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_relation_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83E\uDD1D", title: `${club}: Relations Improved`,
      body: flavorLines[Math.floor(Math.random() * flavorLines.length)],
      color: C.blue, read: false,
    }]);
  }, [transferFocus, leagueTier, seasonNumber]);

  const useTicketDoubleSession = useCallback((ticketId) => {
    setDoubleTrainingWeek(true);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "double_session"]));
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_double_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\u26A1", title: "Double Sessions Scheduled",
      body: "The gaffer has ordered double sessions this week. The lads aren't thrilled, but they'll thank you when the results come in. All training gains will be doubled for the next session.",
      color: C.gold, read: false,
    }]);
  }, [seasonNumber]);

  const useTicketMiracleCream = useCallback((ticketId, playerId) => {
    const player = squad.find(p => p.id === playerId);
    if (!player || !player.injury) return;
    setSquad(prev => prev.map(p => p.id !== playerId ? p : { ...p, injury: null, miracleHealed: true }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "miracle_cream"]));
    const flavorLines = [
      `The club physio swears blind it's just Deep Heat and positive thinking, but whatever was in that bottle has worked wonders. ${player.name} reported for training this morning with a clean bill of health.`,
      `"I've never seen anything like it," said the physio, shaking his head. ${player.name} went from the treatment table to the training pitch in 24 hours flat. Miracle cream indeed.`,
      `${player.name} hobbled into the dressing room yesterday. Today? Sprinting like nothing happened. The medical staff are requesting more of whatever that was.`,
    ];
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_cream_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83E\uDDF4", title: `${player.name}: Miracle Recovery`,
      body: flavorLines[Math.floor(Math.random() * flavorLines.length)],
      color: "#22d3ee", read: false,
    }]);
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
    const flavorLines = [
      `EXCLUSIVE: ${legendName}, former ${club} captain, was spotted at the training ground this morning rallying the lads ahead of the next home game. "This club means everything to me," he told reporters. "I'll be in the stands, and I expect every seat filled." Ticket sales have gone through the roof.`,
      `${legendName} has issued a rallying cry to ${club} supporters ahead of the next home game. In a passionate open letter published in the club fanzine, the former fan favourite urged every supporter to turn up and make some noise. "The boys need us. Let's give them a home advantage they'll never forget."`,
      `The phone lines at ${club} have been ringing off the hook. ${legendName}, beloved former skipper, has been doing the rounds on local radio whipping up a frenzy ahead of the next home fixture. "I've still got my season ticket," he grinned. "And I'll be the loudest one there."`,
    ];
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_12th_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83D\uDCE3", title: `12th Man: ${legendName} Rallies The Fans`,
      body: flavorLines[Math.floor(Math.random() * flavorLines.length)],
      color: "#f97316", read: false,
    }]);
  }, [seasonNumber, teamName, clubHistory.clubAmbassador]);

  const useTicketYouthCoup = useCallback((ticketId) => {
    setYouthCoupActive(true);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "youth_coup"]));
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_youthcoup_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83C\uDF1F", title: "Academy Director: Special Intel",
      body: "Your academy director has pulled some strings with his contacts abroad. \"Trust me, gaffer \u2014 the next intake will feature a real gem. I've seen this kid play and he's the real deal.\"",
      color: "#a78bfa", read: false,
    }]);
  }, [seasonNumber]);

  const useTicketRenamePlayer = useCallback((ticketId, playerId, newName) => {
    const player = squad.find(p => p.id === playerId);
    if (!player || !newName?.trim()) return;
    const trimmed = newName.trim().slice(0, 20);
    const originalName = player.birthName || player.name;
    setSquad(prev => prev.map(p => p.id !== playerId ? p : { ...p, name: trimmed, birthName: originalName }));
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "rename_player"]));
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_rename_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83C\uDFF7\uFE0F", title: `${originalName}: New Shirt Name`,
      body: `${originalName} will now be known as "${trimmed}". The kit man has been up all night with the iron-on letters. The fans are already singing it.`,
      color: "#fb923c", read: false,
    }]);
  }, [squad, seasonNumber]);

  const useTicketTransferInsider = useCallback((ticketId) => {
    const currentSquad = useGameStore.getState().squad;
    const avgOvr = Math.round(currentSquad.reduce((s, p) => s + getOverall(p), 0) / currentSquad.length);
    const agent = generateFreeAgent(leagueTier, avgOvr, ovrCap);
    setPendingFreeAgent(agent);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "transfer_insider"]));
    const ovr = getOverall(agent);
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_insider_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83D\uDD75\uFE0F", title: `Transfer Tip: ${agent.name}`,
      body: `Your contacts have found a promising player available on a free transfer. ${agent.name}, a ${agent.age}-year-old ${agent.position} (OVR ${ovr}), is looking for a new club. Act fast \u2014 other clubs are circling.`,
      color: "#34d399", read: false,
      type: "free_agent_offer", freeAgentData: agent,
      choices: [{ label: "Sign Player", value: "accept" }, { label: "Pass", value: "decline" }],
    }]);
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

    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_scout_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83D\uDD0D", title: `Scouting Report: ${sp.name}`,
      body: lines.join("\n"),
      color: "#818cf8", read: false,
    }]);
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
    setInboxMessages(prev => [...prev, {
      id: `msg_ticket_testimonial_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "\uD83C\uDFA9", title: `${careerName}: One More Match`,
      body: `A familiar face is back! ${careerName} has agreed to lace up the boots one more time. "${career.apps || 0} appearances for this club \u2014 I couldn't say no." He's available for selection in the next match.`,
      color: "#f472b6", read: false,
    }]);
  }, [clubHistory, seasonNumber]);

  const useTicketSaudiAgent = useCallback((ticketId) => {
    const currentSquad = useGameStore.getState().squad;
    const avgOvr = Math.round(currentSquad.reduce((s, p) => s + getOverall(p), 0) / currentSquad.length);
    const agent = generateFreeAgent(leagueTier, avgOvr, ovrCap);
    setPendingFreeAgent(agent);
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setUsedTicketTypes(prev => new Set([...prev, "saudi_agent"]));
    const ovr = getOverall(agent);
    setInboxMessages(prev => [...prev, {
      id: `msg_saudi_agent_${Date.now()}`, week: calendarIndexRef.current + 1, season: seasonNumber,
      icon: "🕌", title: `Saudi Agent: ${agent.name}`,
      body: `Your Saudi connections have delivered. ${agent.name}, a ${agent.age}-year-old ${agent.position} (OVR ${ovr}), is available on a free transfer. Sign now — he won't wait.`,
      color: "#d4a017", read: false,
      type: "free_agent_offer", freeAgentData: agent,
      choices: [{ label: "Sign Player", value: "accept" }, { label: "Pass", value: "decline" }],
    }]);
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
