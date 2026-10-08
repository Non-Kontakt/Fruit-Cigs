const POSITION_ORDER = { ST: 0, AM: 1, RW: 2, LW: 3, CM: 4, RB: 5, LB: 6, CB: 7, GK: 8 };

function eligiblePlayers(team, side, events, startingXI, bench) {
  const squad = team.squad || [];
  const starters = team.isPlayer && startingXI
    ? squad.filter(p => startingXI.includes(p.id))
    : squad.filter(p => !p.isBench && !p.injury);
  const substitutes = team.isPlayer && bench
    ? squad.filter(p => bench.includes(p.id))
    : squad.filter(p => p.isBench && !p.injury);
  const active = new Map(starters.map(p => [p.id ?? p.name, p]));
  for (const event of events) {
    const belongs = event.side != null ? event.side === side : event.cardTeamName === team.name;
    if (event.type === "sub" && (belongs || (event.side == null && event.text?.includes(`Substitution for ${team.name}:`)))) {
      const legacy = event.text?.match(/:\s*(.+?)\s+replaces\s+(.+)$/);
      const off = event.playerOff ?? legacy?.[2]?.trim();
      const on = event.playerOn ?? legacy?.[1]?.trim();
      const leaving = [...active.values()].find(p => event.playerOffId != null ? p.id === event.playerOffId : p.name === off);
      const joining = substitutes.find(p => event.playerOnId != null ? p.id === event.playerOnId : p.name === on);
      if (leaving && joining) {
        active.delete(leaving.id ?? leaving.name);
        active.set(joining.id ?? joining.name, joining);
      }
    }
    if (event.type === "red_card" && belongs) {
      const player = [...active.values()].find(p => event.cardPlayerId != null ? p.id === event.cardPlayerId : p.name === event.cardPlayer);
      if (player) active.delete(player.id ?? player.name);
    }
  }
  return [...active.values()].sort((a, b) => (POSITION_ORDER[a.position] ?? 5) - (POSITION_ORDER[b.position] ?? 5));
}

export function generatePenaltyShootout(homeTeam, awayTeam, events = [], playerStartingXI, playerBench, modifiers = {}) {
  const home = eligiblePlayers(homeTeam, "home", events || [], playerStartingXI, playerBench);
  const away = eligiblePlayers(awayTeam, "away", events || [], playerStartingXI, playerBench);
  const count = Math.min(home.length, away.length);
  if (!count) throw new Error("A penalty shootout requires eligible players on both teams");
  // Reduce to equal numbers, then cycle through every eligible taker,
  // including the keeper, before anybody takes another kick.
  const takers = { home: home.slice(0, count), away: away.slice(0, count) };
  const scores = { home: 0, away: 0 };
  const taken = { home: 0, away: 0 };
  const kicks = [];
  const rate = 0.75 - (modifiers.penaltyConversionNerf || 0);
  const suddenRate = 0.7 - (modifiers.penaltyConversionNerf || 0);
  if (rate <= 0 || rate >= 1 || suddenRate <= 0 || suddenRate >= 1) {
    throw new Error("Penalty conversion probabilities must be between zero and one");
  }
  const kick = (side, round, scored, suddenDeath = false) => {
    const player = takers[side][taken[side] % count];
    taken[side]++;
    if (scored) scores[side]++;
    kicks.push({ round, side, player: player.name, scored, ...(suddenDeath ? { suddenDeath: true } : {}) });
  };
  const clinched = () => scores.home > scores.away + (5 - taken.away) || scores.away > scores.home + (5 - taken.home);
  for (let round = 1; round <= 5; round++) {
    kick("home", round, Math.random() < rate);
    if (clinched()) break;
    kick("away", round, Math.random() < rate);
    if (clinched()) break;
  }
  if (scores.home === scores.away) {
    // Sample the geometric number of tied rounds, then the decisive pair.
    // This is the same distribution as independent sudden-death kicks,
    // without a round cap that can invent a winner at a level score.
    const tiedChance = suddenRate ** 2 + (1 - suddenRate) ** 2;
    const tiedRounds = Math.floor(Math.log1p(-Math.random()) / Math.log(tiedChance));
    for (let i = 0; i < tiedRounds; i++) {
      const bothScore = Math.random() < suddenRate ** 2 / tiedChance;
      kick("home", 6 + i, bothScore, true);
      kick("away", 6 + i, bothScore, true);
    }
    const homeWins = Math.random() < 0.5;
    kick("home", 6 + tiedRounds, homeWins, true);
    kick("away", 6 + tiedRounds, !homeWins, true);
  }
  return { kicks, homeScore: scores.home, awayScore: scores.away, winner: scores.home > scores.away ? "home" : "away" };
}
