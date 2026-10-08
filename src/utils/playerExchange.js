import { getOverall } from "./calc.js";
import { valueTrade } from "./transfer.js";

function resolvePlayers(ids, squad) {
  if (!ids?.length || new Set(ids).size !== ids.length) return null;
  const players = ids.map(id => squad.find(p => p.id === id));
  return players.every(Boolean) ? players : null;
}

function transferPlayer(player, incoming) {
  return {
    ...player,
    clubName: undefined, clubColor: undefined, clubTier: undefined,
    isOwnPlayer: undefined, ovr: undefined,
    training: incoming ? "balanced" : null,
    positionTraining: null, statProgress: {}, gains: {},
    ...(incoming ? {
      history: player.history || [],
      seasonStartOvr: getOverall(player), seasonStartAttrs: { ...player.attrs },
    } : {}),
  };
}

// Resolve IDs against current owners, then publish both sides together. An
// incoming offer may be generous, but must still be a live, unconsumed offer.
export function preparePlayerExchange(state, { clubName, offeredIds, receivedIds, incomingOffer }) {
  if (!state.transferWindowOpen) return null;
  if (incomingOffer && !state.transferOffers.includes(incomingOffer)) return null;
  if (incomingOffer) {
    clubName = incomingOffer.aiClubName;
    offeredIds = incomingOffer.aiWants.map(p => p.id);
    receivedIds = incomingOffer.aiOffers.map(p => p.id);
  }
  const localTeam = state.league?.teams.find(t => t.name === clubName && !t.isPlayer);
  const otherEntry = localTeam ? null : Object.entries(state.allLeagueStates).find(([tier, league]) =>
    Number(tier) !== state.leagueTier && league?.teams.some(t => t.name === clubName && !t.isPlayer));
  const team = localTeam || otherEntry?.[1].teams.find(t => t.name === clubName && !t.isPlayer);
  if (!team?.squad) return null;
  const offered = resolvePlayers(offeredIds, state.squad);
  const received = resolvePlayers(receivedIds, team.squad);
  if (!offered || !received) return null;
  if (offered.some(p => team.squad.some(other => other.id === p.id))
    || received.some(p => state.squad.some(other => other.id === p.id))) return null;
  if (!incomingOffer && !valueTrade(offered, received, team.squad, state.clubRelationships[clubName]?.pct || 0).acceptable) return null;
  const out = new Set(offeredIds), into = new Set(receivedIds);
  const squad = state.squad.filter(p => !out.has(p.id)).concat(received.map(p => transferPlayer(p, true)));
  const aiSquad = team.squad.filter(p => !into.has(p.id)).concat(offered.map(p => transferPlayer(p, false)));
  const updateLeague = league => ({ ...league, teams: league.teams.map(t =>
    t.name === clubName && !t.isPlayer ? { ...t, squad: aiSquad }
      : t.isPlayer && t.squad ? { ...t, squad } : t) });
  const tier = localTeam ? state.leagueTier : otherEntry[0];
  const allLeagueStates = { ...state.allLeagueStates };
  if (allLeagueStates[tier]) allLeagueStates[tier] = updateLeague(allLeagueStates[tier]);
  const patch = {
    squad, allLeagueStates,
    league: localTeam ? updateLeague(state.league) : state.league,
    startingXI: state.startingXI.filter(id => !out.has(id)),
    bench: state.bench.filter(id => !out.has(id)),
    slotAssignments: state.slotAssignments?.map(id => out.has(id) ? null : id) ?? null,
    fiveASideSquad: state.fiveASideSquad?.filter(id => !out.has(id)) ?? null,
    transferOffers: state.transferOffers.filter(offer => offer !== incomingOffer),
  };
  return { offered, received, patch };
}
