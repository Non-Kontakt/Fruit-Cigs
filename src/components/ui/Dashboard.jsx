import React, { useMemo } from "react";
import { F, C, FONT, Z, MODAL } from "../../data/tokens";
import { POS_COLORS } from "../../data/positions.js";
import { LEAGUE_DEFS, NUM_TIERS } from "../../data/leagues.js";
import { getEffectiveSlots, detectFormationName } from "../../utils/formation.js";
import { isMessageVisible } from "../../utils/messageUtils.js";

export function Dashboard({
  inboxMessages, week, seasonNumber,
  formation, startingXI, squad, slotAssignments,
  league, leagueTier, teamName, newspaperName, matchweekIndex, leagueResults,
  seasonCalendar, calendarIndex, cup,
  playerSeasonStats, playerRatingTracker, recentScorelines,
  consecutiveWins, consecutiveUnbeaten, consecutiveLosses,
  seasonGoalsFor, seasonCleanSheets, seasonDraws,
  calendarResults, clubHistory,
  onOpenInbox, onOpenLeague, onOpenSquad, onAsstXI, onInboxChoice, setInboxMessages,
  isMobile,
  onPlayerClick, onTeamClick,
  fanSentiment = 50, boardSentiment = 50,
  ultimatumActive = false, ultimatumPtsEarned = 0, ultimatumTarget = 0, ultimatumGamesLeft = 0,
  gameMode = "casual",
  showLineupWarning = false, onDismissLineupWarning, onLineupWarningGoToSquad, onLineupWarningPlayAnyway,
}) {
  const mob = isMobile;

  // ─── Derived data ───

  const slotPlayers = useMemo(() => {
    if (!formation || !startingXI || !squad) return [];
    return getEffectiveSlots(startingXI, formation, squad, slotAssignments);
  }, [startingXI, formation, squad, slotAssignments]);

  const getPlayer = (idx) => {
    const id = slotPlayers[idx];
    return id != null ? squad.find(p => p.id === id) : null;
  };

  const formationName = useMemo(() => {
    return formation ? detectFormationName(formation) : "---";
  }, [formation]);

  // Inbox
  const visibleMessages = useMemo(() => {
    if (!inboxMessages) return [];
    return [...inboxMessages]
      .filter(m => isMessageVisible(m, week || 1))
      .sort((a, b) => {
        if ((b.season || 1) !== (a.season || 1)) return (b.season || 1) - (a.season || 1);
        return (b.week || 1) - (a.week || 1);
      });
  }, [inboxMessages, week]);

  const unreadCount = useMemo(() => {
    if (!inboxMessages) return 0;
    return inboxMessages.filter(m => !m.read && isMessageVisible(m, week || 1)).length;
  }, [inboxMessages, week]);

  // League table
  const sortedTable = useMemo(() => {
    if (!league?.table || !league?.teams) return [];
    return [...league.table].sort((a, b) =>
      b.points - a.points
      || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      || b.goalsFor - a.goalsFor
    );
  }, [league]);

  // Results ticker
  const latestResults = useMemo(() => {
    if (!leagueResults || matchweekIndex <= 0) return [];
    for (let md = matchweekIndex - 1; md >= 0; md--) {
      if (leagueResults[md] && leagueResults[md].length > 0) return leagueResults[md];
    }
    return [];
  }, [leagueResults, matchweekIndex]);

  const leagueDef = LEAGUE_DEFS[leagueTier] || {};
  const leagueColor = leagueDef.color || C.textMuted;
  const totalMDs = league?.fixtures?.length || 18;
  const totalTeams = sortedTable.length;

  const playerRow = useMemo(() => {
    const idx = sortedTable.findIndex(r => league?.teams?.[r.teamIndex]?.isPlayer);
    return idx >= 0 ? { pos: idx + 1, ...sortedTable[idx] } : null;
  }, [sortedTable, league]);

  // Form guide — last 5 results from calendarResults
  const formGuide = useMemo(() => {
    if (!calendarResults) return [];
    const entries = Object.entries(calendarResults)
      .map(([k, v]) => ({ idx: Number(k), ...v }))
      .filter(r => !r.spectator)
      .sort((a, b) => b.idx - a.idx)
      .slice(0, 5)
      .reverse();
    return entries;
  }, [calendarResults]);

  // Current streak text
  const streakText = useMemo(() => {
    if (consecutiveWins >= 3) return `W${consecutiveWins}`;
    if (consecutiveUnbeaten >= 5) return `Unbeaten ${consecutiveUnbeaten}`;
    if (consecutiveLosses >= 3) return `L${consecutiveLosses}`;
    if (consecutiveWins > 0) return `W${consecutiveWins}`;
    if (consecutiveLosses > 0) return `L${consecutiveLosses}`;
    return null;
  }, [consecutiveWins, consecutiveUnbeaten, consecutiveLosses]);

  // W/D/L record
  const record = useMemo(() => {
    if (!calendarResults) return { w: 0, d: 0, l: 0 };
    const vals = Object.values(calendarResults).filter(r => !r.spectator);
    return {
      w: vals.filter(r => r.won).length,
      d: vals.filter(r => r.draw).length,
      l: vals.filter(r => !r.won && !r.draw).length,
    };
  }, [calendarResults]);

  // Headline
  const headline = useMemo(() => {
    // Last result from calendarResults
    if (!calendarResults || !seasonCalendar) return { main: "THE SEASON AWAITS", sub: null };
    const sorted = Object.entries(calendarResults)
      .map(([k, v]) => ({ idx: Number(k), ...v }))
      .filter(r => !r.spectator)
      .sort((a, b) => b.idx - a.idx);
    if (sorted.length === 0) return { main: "THE SEASON AWAITS", sub: null };
    const last = sorted[0];
    const calEntry = seasonCalendar[last.idx];
    const tn = (teamName || "CITY").toUpperCase();

    // Find opponent name + match context
    let oppName = "OPPONENT";
    let isCup = calEntry?.type === "cup";
    let cupRoundName = calEntry?.cupRoundName || "";
    let isFinal = cupRoundName.toLowerCase().includes("final") && !cupRoundName.toLowerCase().includes("semi");

    if (calEntry?.type === "league" && league?.fixtures && league?.teams) {
      const md = calEntry.leagueMD;
      const fixture = league.fixtures[md];
      if (fixture) {
        const pIdx = league.teams.findIndex(t => t.isPlayer);
        const match = fixture.find(m => m.home === pIdx || m.away === pIdx);
        if (match) {
          const oppIdx = match.home === pIdx ? match.away : match.home;
          oppName = (league.teams[oppIdx]?.name || "OPPONENT").toUpperCase();
        }
      }
    } else if (isCup && cup?.rounds) {
      const round = cup.rounds[calEntry.cupRound];
      if (round?.matches) {
        const pm = round.matches.find(m => m.home?.isPlayer || m.away?.isPlayer);
        if (pm) {
          const opp = pm.home?.isPlayer ? pm.away : pm.home;
          oppName = (opp?.name || "OPPONENT").toUpperCase();
        }
      }
    }

    const { playerGoals: pg, oppGoals: og, won, draw } = last;
    const cupName = (cup?.cupName || "THE CUP").toUpperCase();
    let main;

    if (isCup) {
      if (won && isFinal) {
        main = `${tn} WIN ${cupName}! ${pg}-${og} OVER ${oppName}`;
      } else if (won) {
        main = `${tn} ADVANCE IN ${cupName} \u2014 ${pg}-${og} VS ${oppName}`;
      } else if (draw) {
        main = `${cupName}: ${tn} DRAW ${pg}-${og} WITH ${oppName}`;
      } else if (isFinal) {
        main = `HEARTBREAK! ${tn} LOSE ${cupName} FINAL ${pg}-${og} TO ${oppName}`;
      } else {
        main = `${tn} KNOCKED OUT OF ${cupName} ${pg}-${og} BY ${oppName}`;
      }
    } else {
      if (won) {
        main = `${tn} TRIUMPH ${pg}-${og} OVER ${oppName}`;
      } else if (draw) {
        main = `HONOURS EVEN \u2014 ${tn} DRAW ${pg}-${og} WITH ${oppName}`;
      } else {
        main = `${tn} SUFFER ${pg}-${og} LOSS TO ${oppName}`;
      }
    }

    const sub = playerRow
      ? `W${record.w} D${record.d} L${record.l} \u00B7 GF ${seasonGoalsFor || 0} \u00B7 ${playerRow.pos}${playerRow.pos === 1 ? "st" : playerRow.pos === 2 ? "nd" : playerRow.pos === 3 ? "rd" : "th"} in ${leagueDef.name || "League"}`
      : null;

    return { main, sub };
  }, [calendarResults, seasonCalendar, league, teamName, playerRow, record, seasonGoalsFor, leagueDef, cup]);

  // Top scorers (squad)
  const topScorer = useMemo(() => {
    if (!playerSeasonStats) return null;
    let best = null;
    Object.entries(playerSeasonStats).forEach(([name, s]) => {
      if (s.goals > 0 && (!best || s.goals > best.goals)) {
        best = { name, goals: s.goals, apps: s.apps || 0 };
      }
    });
    return best;
  }, [playerSeasonStats]);

  // Best rated player
  const bestRated = useMemo(() => {
    if (!playerRatingTracker) return null;
    let best = null;
    Object.entries(playerRatingTracker).forEach(([name, ratings]) => {
      if (!ratings || ratings.length === 0) return;
      const recent = ratings.slice(-5);
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (!best || avg > best.avg) {
        best = { name, avg };
      }
    });
    return best;
  }, [playerRatingTracker]);

  // Injury count
  const injuredCount = useMemo(() => {
    if (!squad) return 0;
    return squad.filter(p => p.injury).length;
  }, [squad]);

  // Golden Boot — top scorers across league
  const goldenBoot = useMemo(() => {
    if (!playerSeasonStats || !leagueResults) return [];
    // Aggregate all goals from league results
    const scorers = {};
    // Player's squad goals
    Object.entries(playerSeasonStats).forEach(([name, s]) => {
      if (s.goals > 0) {
        scorers[name] = { name, goals: s.goals, team: teamName || "You" };
      }
    });
    // We only have detailed data for player's squad, so just show player scorers
    return Object.values(scorers)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, mob ? 3 : 5);
  }, [playerSeasonStats, leagueResults, teamName, mob]);

  // Cup info
  const cupInfo = useMemo(() => {
    if (!cup) return null;
    const roundNames = ["Round of 32", "Round of 16", "QF", "SF", "Final"];
    if (cup.playerEliminated) {
      const elimRound = cup.rounds?.findIndex((r, i) => {
        const match = (r.matches || r).find(m => m.home?.isPlayer || m.away?.isPlayer);
        if (!match) return false;
        const pIsHome = match.home?.isPlayer;
        const res = match.result;
        if (!res) return false;
        return pIsHome ? res.homeGoals < res.awayGoals : res.awayGoals < res.homeGoals;
      });
      const elimIdx = elimRound >= 0 ? elimRound : Math.max(0, cup.currentRound - 1);
      const elimLabel = roundNames[elimIdx] || `Round ${elimIdx + 1}`;
      return { eliminated: true, round: elimIdx, roundLabel: elimLabel, name: cup.cupName || "Clubman Cup" };
    }
    // Active
    const pm = cup.pendingPlayerMatch;
    const oppName = pm ? (pm.home?.isPlayer ? pm.away?.name : pm.home?.name) : null;
    const roundName = roundNames[cup.currentRound] || `Round ${cup.currentRound + 1}`;
    return { eliminated: false, name: cup.cupName || "Clubman Cup", roundName, opponent: oppName };
  }, [cup]);

  // ─── Newspaper styles ───

  const RULE = C.bgCard;
  const RULE_LIGHT = C.bgCard;
  const HEADER_COLOR = C.textDim;
  // FONT imported from tokens

  const sectionHeader = (text, color) => (
    <div style={{
      fontSize: mob ? F.xs : F.sm,
      color: color || HEADER_COLOR,
      textTransform: "uppercase",
      letterSpacing: 2,
      padding: mob ? "12px 0 10px" : "16px 0 10px",
      borderBottom: `1px solid ${color ? color + "44" : C.bgInput}`,
      marginBottom: 12,
      fontFamily: FONT,
    }}>{text}</div>
  );

  const dotSep = <span style={{ color: C.bgInput, margin: "0 8px" }}>{"\u00B7"}</span>;

  return (
    <div style={{ paddingBottom: 42, fontFamily: FONT }}>
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* ═══ ULTIMATUM BANNER — above everything ═══ */}
      {ultimatumActive && gameMode === "ironman" && (() => {
        const pct = Math.min(100, (ultimatumPtsEarned / Math.max(1, ultimatumTarget)) * 100);
        const done = ultimatumPtsEarned >= ultimatumTarget;
        return (
          <div style={{
            marginBottom: mob ? 10 : 14,
            border: `2px solid rgba(248,113,113,0.5)`,
            background: "rgba(248,113,113,0.06)",
          }}>
            {/* Top row */}
            <div style={{
              padding: mob ? "12px 14px 10px" : "16px 20px 12px",
              display: "flex", alignItems: "baseline",
              justifyContent: "space-between", gap: 12, flexWrap: "wrap",
            }}>
              <div style={{ fontSize: mob ? F.sm : F.md, color: C.lightRed, letterSpacing: 2, lineHeight: 1.4 }}>
                ⚠ BOARD ULTIMATUM
              </div>
              <div style={{ fontSize: F.xs, color: "#94a3b8", textAlign: "right" }}>
                {ultimatumGamesLeft} match{ultimatumGamesLeft !== 1 ? "es" : ""} remaining
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ padding: mob ? "0 14px" : "0 20px" }}>
              <div style={{ height: 8, background: "rgba(15,23,42,0.6)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: done ? "#4ade80" : C.lightRed,
                  borderRadius: 2, transition: "width 0.5s",
                  boxShadow: done ? "0 0 8px rgba(74,222,128,0.5)" : "0 0 8px rgba(248,113,113,0.4)",
                }} />
              </div>
            </div>
            {/* Bottom row */}
            <div style={{
              padding: mob ? "8px 14px 12px" : "10px 20px 16px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ fontSize: F.xs, color: "#94a3b8" }}>
                {ultimatumPtsEarned} point{ultimatumPtsEarned !== 1 ? "s" : ""} earned
              </div>
              <div style={{ fontSize: mob ? F.sm : F.md, color: done ? "#4ade80" : C.lightRed, letterSpacing: 1 }}>
                {ultimatumPtsEarned} / {ultimatumTarget} pts
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ NEWSPAPER FRAME ═══ */}
      <div style={{
        border: mob ? "none" : `1px solid ${RULE}`,
        borderTop: mob ? "none" : `double 3px ${C.slate}`,
        borderBottom: mob ? "none" : `1px solid ${RULE}`,
      }}>

      {/* ═══ MASTHEAD ═══ */}
      <div style={{
        borderBottom: `double 3px ${C.slate}`,
        padding: mob ? "18px 12px 16px" : "24px 20px 20px",
        textAlign: "center",
        background: "linear-gradient(180deg, rgba(30,41,59,0.3) 0%, transparent 100%)",
      }}>
        <div style={{
          fontSize: mob ? F.lg : F.h3,
          color: "#f1f5f9",
          letterSpacing: mob ? 3 : 6,
          lineHeight: 1.4,
        }}>
          {(newspaperName || `The ${teamName || "City"} Gazette`).toUpperCase()}
        </div>
        <div style={{
          fontSize: F.xs,
          color: HEADER_COLOR,
          marginTop: 6,
          letterSpacing: 1,
        }}>
          SEASON {seasonNumber || 1}{dotSep}WEEK {week || 1}{dotSep}{(leagueDef.name || "League").toUpperCase()}
        </div>
      </div>

      {/* ═══ HEADLINE BANNER ═══ */}
      <div style={{
        borderBottom: `1px solid ${RULE}`,
        padding: mob ? "16px 12px 14px" : "20px 20px 16px",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: mob ? F.md : F.xl,
          color: "#f1f5f9",
          lineHeight: 1.6,
          letterSpacing: 1,
        }}>
          {headline.main}
        </div>
        {headline.sub && (
          <div style={{
            fontSize: F.xs,
            color: HEADER_COLOR,
            marginTop: 6,
            letterSpacing: 1,
          }}>
            {headline.sub}
          </div>
        )}
      </div>

      {/* ═══ 3-COLUMN GRID ═══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: mob ? "1fr" : "minmax(0, 4fr) minmax(0, 4fr) minmax(0, 3fr)",
        gap: 0,
        alignItems: "stretch",
      }}>

        {/* ═══ LEFT COLUMN ═══ */}
        <div style={{
          borderRight: mob ? "none" : `1px solid ${RULE}`,
          padding: mob ? "12px 8px" : "16px 20px",
          minWidth: 0,
        }}>

          {/* INBOX */}
          {sectionHeader(
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.blue }}>
                Inbox
                {unreadCount > 0 && (
                  <span style={{
                    background: C.red, color: "#fff", fontSize: F.xs,
                    padding: "2px 6px", marginLeft: 8, borderRadius: 3,
                    verticalAlign: "middle",
                  }}>{unreadCount}</span>
                )}
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <button onClick={() => {
                  if (setInboxMessages) setInboxMessages(prev => prev.map(m => ({ ...m, read: true })));
                }} style={{
                  padding: "4px 8px", fontSize: F.xs, fontFamily: FONT,
                  background: "transparent", border: `1px solid ${C.bgInput}`,
                  color: HEADER_COLOR, cursor: "pointer",
                }}>MARK READ</button>
                <button onClick={onOpenInbox} style={{
                  padding: "4px 8px", fontSize: F.xs, fontFamily: FONT,
                  background: "transparent", border: `1px solid ${C.bgInput}`,
                  color: HEADER_COLOR, cursor: "pointer",
                }}>ALL &gt;</button>
              </span>
            </span>
          )}
          <div style={{ marginBottom: 16 }}>
            {visibleMessages.length === 0 ? (
              <div style={{ padding: "12px 0", fontSize: F.xs, color: C.bgInput }}>
                No messages yet.
              </div>
            ) : visibleMessages.slice(0, 3).map(msg => (
              <div key={msg.id} onClick={onOpenInbox} style={{
                padding: "8px 0",
                borderBottom: `1px dotted ${RULE_LIGHT}`,
                cursor: "pointer",
              }}>
                <div style={{
                  fontSize: mob ? F.xs : F.sm,
                  color: msg.color || C.blue,
                  lineHeight: 1.5,
                }}>
                  {msg.icon} {msg.title}
                  {!msg.read && <span style={{ fontSize: F.xs, color: C.red, marginLeft: 6 }}>{"\u25CF"}</span>}
                </div>
                {msg.body && !msg.choices && (
                  <div style={{
                    fontSize: F.xs, color: "#556677", lineHeight: 1.7, marginTop: 3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {msg.body.split("\n")[0]}
                  </div>
                )}
                {msg.choiceResult && (
                  <div style={{ fontSize: F.xs, color: msg.choiceResult === "accept" ? C.green : C.lightRed, marginTop: 4, fontStyle: "italic" }}>
                    {msg.choiceResult === "accept" ? "Accepted" : "Declined"}
                  </div>
                )}
                {msg.followUp && (
                  <div style={{ fontSize: F.xs, color: C.amber, marginTop: 4, lineHeight: 1.5 }}>{msg.followUp}</div>
                )}
                {msg.choices && !msg.choiceResult && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {msg.choices.map(choice => (
                      <button key={choice.value} onClick={() => {
                        if (onInboxChoice && onInboxChoice(msg, choice.value) === false) return;
                        if (setInboxMessages) {
                          setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, choiceResult: choice.value, read: true } : m));
                        }
                      }} style={{
                        padding: "6px 10px", fontSize: F.xs, fontFamily: FONT,
                        background: choice.value === "accept" ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.08)",
                        border: `1px solid ${choice.value === "accept" ? C.green : C.red}`,
                        color: choice.value === "accept" ? C.green : C.lightRed,
                        cursor: "pointer",
                      }}>{choice.label}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CLUB MOOD */}
          {sectionHeader("Club Mood", C.textMuted)}
          <div style={{ marginBottom: 16 }}>
            {[
              { label: "FANS", value: fanSentiment },
              { label: "BOARD", value: boardSentiment },
            ].map(({ label, value }) => {
              const color = value >= 75 ? "#4ade80" : value >= 50 ? C.amber : value >= 25 ? "#fb923c" : C.lightRed;
              const mood = value >= 75 ? "Buzzing" : value >= 50 ? "Content" : value >= 25 ? "Concerned" : "Unrest";
              return (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: F.xs, color: HEADER_COLOR, marginBottom: 4 }}>
                    <span>{label}</span><span style={{ color }}>{mood}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(30,41,59,0.5)", borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* FORM GUIDE */}
          {sectionHeader("Form Guide", C.textMuted)}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
            {formGuide.length > 0 ? formGuide.map((r, i) => (
              <div key={i} style={{
                width: mob ? 16 : 18, height: mob ? 16 : 18, borderRadius: "50%",
                background: r.won ? C.green : r.draw ? C.amber : C.red,
                boxShadow: `0 0 6px ${r.won ? "rgba(74,222,128,0.3)" : r.draw ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`,
              }} />
            )) : (
              <span style={{ fontSize: F.xs, color: C.bgInput }}>No results yet</span>
            )}
            {streakText && (
              <>
                <span style={{ color: C.bgInput, margin: "0 4px" }}>{"\u00B7"}</span>
                <span style={{
                  fontSize: F.xs,
                  color: consecutiveLosses >= 3 ? C.red : C.green,
                }}>{streakText}</span>
              </>
            )}
          </div>

          {/* Recent results */}
          {recentScorelines && recentScorelines.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {recentScorelines.slice(-3).reverse().map((sc, i) => {
                const isW = sc[0] > sc[1], isL = sc[0] < sc[1];
                const tag = isW ? "W" : isL ? "L" : "D";
                const tagColor = isW ? C.green : isL ? C.red : C.amber;
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: F.xs, color: C.textMuted, lineHeight: 2.0,
                    borderBottom: i < 2 ? `1px dotted ${RULE_LIGHT}` : "none",
                    padding: "3px 0",
                  }}>
                    <span>{sc[0]}-{sc[1]}</span>
                    <span style={{ color: tagColor, fontSize: F.xs }}>{tag}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* SEASON OVERVIEW */}
          {sectionHeader("Season Overview", C.textMuted)}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            marginBottom: 16,
          }}>
            {[
              { label: "GF", value: seasonGoalsFor || 0 },
              { label: "CS", value: seasonCleanSheets || 0 },
              { label: "POS", value: playerRow ? `${playerRow.pos}${playerRow.pos === 1 ? "st" : playerRow.pos === 2 ? "nd" : playerRow.pos === 3 ? "rd" : "th"}` : "---" },
              { label: "PTS", value: playerRow ? playerRow.points : "---" },
            ].map(s => (
              <div key={s.label} style={{
                border: `1px solid ${RULE}`,
                padding: mob ? "10px 6px" : "12px 8px",
                textAlign: "center",
                background: "rgba(30,41,59,0.25)",
              }}>
                <div style={{ fontSize: F.xs, color: HEADER_COLOR, marginBottom: 5 }}>{s.label}</div>
                <div style={{ fontSize: mob ? F.md : F.lg, color: "#f1f5f9" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ CENTER COLUMN ═══ */}
        <div style={{
          borderRight: mob ? "none" : `1px solid ${RULE}`,
          padding: mob ? "12px 8px" : "16px 20px",
          minWidth: 0,
        }}>

          {/* SQUAD / MINI PITCH */}
          {sectionHeader(
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.green }}>{formationName}</span>
              <span style={{ display: "flex", gap: 6 }}>
                <button onClick={onAsstXI} style={{
                  padding: "4px 8px", fontSize: F.xs, fontFamily: FONT,
                  background: "transparent", border: `1px solid ${C.bgInput}`,
                  color: HEADER_COLOR, cursor: "pointer",
                }}>ASST XI</button>
                <button onClick={onOpenSquad} style={{
                  padding: "4px 8px", fontSize: F.xs, fontFamily: FONT,
                  background: "transparent", border: `1px solid ${C.bgInput}`,
                  color: HEADER_COLOR, cursor: "pointer",
                }}>SQUAD &gt;</button>
              </span>
            </span>
          )}
          <div style={{
            position: "relative",
            width: "100%",
            paddingBottom: "105%",
            background: "linear-gradient(180deg, #1a5c2a 0%, #1e6b31 30%, #1a6b2f 60%, #1a5c2a 100%)",
            overflow: "hidden",
            marginBottom: 16,
          }}>
            {/* Pitch markings */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: "3%", left: "5%", right: "5%", bottom: "3%", border: "1px solid rgba(255,255,255,0.18)" }} />
              <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: 1, background: "rgba(255,255,255,0.14)" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 60, height: 60, border: "1px solid rgba(255,255,255,0.14)", borderRadius: "50%" }} />
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 5, height: 5, background: "rgba(255,255,255,0.18)", borderRadius: "50%" }} />
              <div style={{ position: "absolute", bottom: "3%", left: "22%", right: "22%", height: "16%", border: "1px solid rgba(255,255,255,0.14)", borderBottom: "none" }} />
              <div style={{ position: "absolute", bottom: "3%", left: "32%", right: "32%", height: "8%", border: "1px solid rgba(255,255,255,0.10)", borderBottom: "none" }} />
              <div style={{ position: "absolute", top: "3%", left: "22%", right: "22%", height: "16%", border: "1px solid rgba(255,255,255,0.14)", borderTop: "none" }} />
              <div style={{ position: "absolute", top: "3%", left: "32%", right: "32%", height: "8%", border: "1px solid rgba(255,255,255,0.10)", borderTop: "none" }} />
            </div>
            {/* Formation dots */}
            {formation && formation.map((slot, idx) => {
              const player = getPlayer(idx);
              const dotSize = mob ? 34 : 38;
              return (
                <div key={idx} style={{
                  position: "absolute",
                  left: `${slot.x}%`, top: `${slot.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: Z.base, pointerEvents: "none",
                }}>
                  <div style={{
                    width: dotSize, height: dotSize, borderRadius: "50%",
                    background: `radial-gradient(circle at 40% 35%, ${POS_COLORS[slot.pos] || C.textMuted}, ${POS_COLORS[slot.pos] || C.textMuted}88)`,
                    border: "2px solid rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: mob ? F.xs : F.sm, color: "#fff",
                    fontFamily: FONT,
                    boxShadow: "0 3px 10px rgba(0,0,0,0.6)",
                  }}>
                    {slot.pos}
                  </div>
                  <div style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    marginTop: 3, fontSize: mob ? F.micro : F.xs, color: "#ffffffdd",
                    whiteSpace: "nowrap", textAlign: "center",
                    textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                    fontFamily: FONT,
                  }}>
                    {player ? player.name.split(" ").pop().slice(0, 8) : "\u2014"}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SQUAD NEWS */}
          {sectionHeader("Squad News", C.green)}
          <div style={{ marginBottom: 16 }}>
            {topScorer ? (
              <div style={{ fontSize: F.xs, color: C.textMuted, lineHeight: 2.2, borderBottom: `1px dotted ${RULE_LIGHT}`, padding: "3px 0" }}>
                <span onClick={() => onPlayerClick?.(topScorer.name)} style={{ color: C.green, cursor: "pointer" }}>{topScorer.name}</span>{" \u2014 "}{topScorer.goals} goal{topScorer.goals !== 1 ? "s" : ""} in {topScorer.apps} app{topScorer.apps !== 1 ? "s" : ""}
              </div>
            ) : null}
            {bestRated ? (
              <div style={{ fontSize: F.xs, color: C.textMuted, lineHeight: 2.2, borderBottom: `1px dotted ${RULE_LIGHT}`, padding: "3px 0" }}>
                <span onClick={() => onPlayerClick?.(bestRated.name)} style={{ color: C.amber, cursor: "pointer" }}>{bestRated.name}</span>{" \u2014 "}avg {bestRated.avg.toFixed(1)}
              </div>
            ) : null}
            {injuredCount > 0 ? (
              <div style={{ fontSize: F.xs, color: C.red, lineHeight: 2.2, padding: "3px 0" }}>
                {injuredCount} player{injuredCount !== 1 ? "s" : ""} injured
              </div>
            ) : null}
            {!topScorer && !bestRated && injuredCount === 0 && (
              <div style={{ fontSize: F.xs, color: C.bgInput, padding: "6px 0" }}>Season not yet started</div>
            )}
          </div>

          {/* GOLDEN BOOT */}
          {goldenBoot.length > 0 && (
            <>
              {sectionHeader("Top Scorers", C.amber)}
              <div style={{ marginBottom: 16 }}>
                {goldenBoot.map((s, i) => (
                  <div key={s.name} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: F.xs, color: i === 0 ? C.amber : C.textMuted,
                    lineHeight: 2.2,
                    borderBottom: i < goldenBoot.length - 1 ? `1px dotted ${RULE_LIGHT}` : "none",
                    padding: "2px 0",
                  }}>
                    <span onClick={() => onPlayerClick?.(s.name)} style={{ cursor: "pointer" }}>{i + 1}. {s.name}</span>
                    <span style={{ color: C.text }}>{s.goals}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div style={{
          padding: mob ? "12px 8px" : "16px 20px",
          minWidth: 0,
        }}>

          {/* LEAGUE TABLE */}
          {sectionHeader(
            <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: leagueColor }}>
                {leagueDef.shortName || leagueDef.name || "League"}
                {playerRow && (
                  <span style={{
                    fontSize: F.xs, color: C.green, marginLeft: 8,
                    background: "rgba(74,222,128,0.1)", padding: "2px 6px",
                  }}>{playerRow.pos}{playerRow.pos === 1 ? "st" : playerRow.pos === 2 ? "nd" : playerRow.pos === 3 ? "rd" : "th"}</span>
                )}
              </span>
              <button onClick={onOpenLeague} style={{
                padding: "4px 8px", fontSize: F.xs, fontFamily: FONT,
                background: "transparent", border: `1px solid ${C.bgInput}`,
                color: HEADER_COLOR, cursor: "pointer",
              }}>FULL &gt;</button>
            </span>
          )}

          <div style={{ fontSize: F.xs, color: HEADER_COLOR, marginBottom: 8 }}>
            MD {matchweekIndex} / {totalMDs}
          </div>

          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "22px 1fr 26px 32px 32px",
            padding: "6px 0", fontSize: F.xs, color: HEADER_COLOR,
            borderBottom: `1px solid ${C.bgInput}`, gap: 2,
          }}>
            <span>#</span><span>TEAM</span>
            <span style={{ textAlign: "center" }}>P</span>
            <span style={{ textAlign: "center" }}>GD</span>
            <span style={{ textAlign: "center" }}>PTS</span>
          </div>

          {sortedTable.map((row, pos) => {
            const tm = league.teams[row.teamIndex];
            const gd = row.goalsFor - row.goalsAgainst;
            const inPromoZone = leagueTier > 1 && pos <= 2;
            const inRelegZone = leagueTier < NUM_TIERS && pos >= totalTeams - 3;
            const isPlayer = tm?.isPlayer;
            return (
              <div key={tm?.name || pos} style={{
                display: "grid", gridTemplateColumns: "22px 1fr 26px 32px 32px",
                padding: "7px 0", fontSize: mob ? F.xs : F.sm, gap: 2,
                borderBottom: `1px dotted ${RULE_LIGHT}`,
                borderLeft: inPromoZone ? `3px solid ${C.gold}` : inRelegZone ? `3px solid ${C.red}` : "3px solid transparent",
                background: isPlayer ? "rgba(74,222,128,0.06)" : "transparent",
                paddingLeft: 4, alignItems: "center",
              }}>
                <span style={{ color: inPromoZone ? C.gold : inRelegZone ? C.red : HEADER_COLOR, fontSize: F.xs }}>{pos + 1}</span>
                <span onClick={() => tm?.name && onTeamClick?.(tm.name)} style={{
                  color: isPlayer ? C.green : C.text,
                  fontWeight: isPlayer ? "bold" : "normal",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  cursor: tm?.name ? "pointer" : "default",
                }}>{tm?.name || "\u2014"}</span>
                <span style={{ textAlign: "center", color: C.textMuted }}>{row.played}</span>
                <span style={{ textAlign: "center", color: gd > 0 ? C.green : gd < 0 ? C.red : HEADER_COLOR }}>{gd > 0 ? `+${gd}` : gd}</span>
                <span style={{ textAlign: "center", color: "#f0f0f0", fontWeight: "bold" }}>{row.points}</span>
              </div>
            );
          })}

          {/* CUP CORNER */}
          {cupInfo && (
            <>
              {sectionHeader("Cup Corner", "#fb923c")}
              <div style={{ fontSize: F.xs, color: C.textMuted, lineHeight: 2.2, marginBottom: 16 }}>
                <div style={{ color: C.text, marginBottom: 2 }}>{cupInfo.name}</div>
                {cupInfo.eliminated ? (
                  <div style={{ color: C.red }}>
                    Eliminated in {cupInfo.roundLabel}
                  </div>
                ) : (
                  <>
                    <div>{cupInfo.roundName}</div>
                    {cupInfo.opponent && (
                      <div>vs <span onClick={() => onTeamClick?.(cupInfo.opponent)} style={{ color: C.text, cursor: "pointer" }}>{cupInfo.opponent}</span></div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* CLUB RECORDS */}
          {clubHistory && clubHistory.totalWins > 0 && (
            <>
              {sectionHeader("Club Records", C.textMuted)}
              <div style={{ fontSize: F.xs, color: C.textMuted, lineHeight: 2.2 }}>
                {clubHistory.biggestWin && (
                  <div style={{ borderBottom: `1px dotted ${RULE_LIGHT}`, padding: "2px 0" }}>
                    Best: <span style={{ color: C.green }}>{clubHistory.biggestWin.score}</span> vs <span onClick={() => onTeamClick?.(clubHistory.biggestWin.opponent)} style={{ cursor: "pointer" }}>{clubHistory.biggestWin.opponent}</span>
                  </div>
                )}
                <div style={{ borderBottom: `1px dotted ${RULE_LIGHT}`, padding: "2px 0" }}>
                  W{clubHistory.totalWins} D{clubHistory.totalDraws} L{clubHistory.totalLosses}
                </div>
                {clubHistory.bestWinStreak > 0 && (
                  <div style={{ padding: "2px 0" }}>
                    Best streak: <span style={{ color: C.green }}>W{clubHistory.bestWinStreak}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </div>{/* end newspaper frame */}

      {/* ═══ LINEUP WARNING MODAL ═══ */}
      {showLineupWarning && (
        <div style={{ ...MODAL.backdrop, zIndex: Z.confirm }}>
          <div style={{
            ...MODAL.box,
            border: `3px solid ${C.amber}`,
            padding: mob ? "30px 20px" : "40px 44px",
            width: mob ? "90%" : "auto",
            boxShadow: "0 0 50px rgba(251,191,36,0.25), inset 0 0 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              fontSize: mob ? F.md : F.lg,
              color: C.amber,
              marginBottom: 18,
              letterSpacing: 2,
            }}>
              ⚠️ NO LINEUP SET
            </div>
            <div style={{
              fontSize: mob ? F.xs : F.sm,
              color: C.text,
              lineHeight: 1.8,
              marginBottom: 28,
            }}>
              You haven't selected your starting lineup!
              <br />
              Go to Squad to assign players.
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={onLineupWarningGoToSquad} style={{
                padding: mob ? "12px 20px" : "15px 30px",
                fontSize: mob ? F.xs : F.md,
                fontFamily: FONT,
                background: "rgba(74,222,128,0.15)",
                border: `2px solid ${C.green}`,
                color: C.green,
                cursor: "pointer",
                letterSpacing: 1,
              }}>
                GO TO SQUAD
              </button>
              <button onClick={onLineupWarningPlayAnyway} style={{
                padding: mob ? "12px 20px" : "15px 30px",
                fontSize: mob ? F.xs : F.md,
                fontFamily: FONT,
                background: "rgba(239,68,68,0.1)",
                border: `2px solid ${C.red}`,
                color: C.red,
                cursor: "pointer",
                letterSpacing: 1,
              }}>
                PLAY ANYWAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESULTS TICKER (fixed bottom) ═══ */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: Z.bar,
        background: "#08081a", borderTop: `1px solid ${RULE}`,
        height: 34, overflow: "hidden",
        display: "flex", alignItems: "center",
        fontFamily: FONT,
      }}>
        {latestResults.length === 0 ? (
          <div style={{ width: "100%", textAlign: "center", fontSize: mob ? F.xs : F.sm, color: C.bgInput }}>
            No results yet
          </div>
        ) : (
          <div style={{
            display: "flex", whiteSpace: "nowrap",
            animation: `tickerScroll ${Math.max(20, latestResults.length * 4)}s linear infinite`,
            willChange: "transform",
          }}>
            {[0, 1].map(copy => (
              <div key={copy} style={{ display: "flex", flexShrink: 0, alignItems: "center" }}>
                {latestResults.map((match, i) => {
                  const homeTeam = league?.teams?.[match.home];
                  const awayTeam = league?.teams?.[match.away];
                  const isPlayerMatch = homeTeam?.isPlayer || awayTeam?.isPlayer;
                  return (
                    <span key={`${copy}-${i}`} style={{ display: "inline-flex", alignItems: "center" }}>
                      <span style={{
                        fontSize: F.xs,
                        color: isPlayerMatch ? C.green : C.textMuted,
                      }}>
                        {homeTeam?.name || "?"}{" "}
                        <span style={{ color: isPlayerMatch ? "#fff" : C.text, fontWeight: "bold" }}>
                          {match.homeGoals}-{match.awayGoals}
                        </span>{" "}
                        {awayTeam?.name || "?"}
                      </span>
                      <span style={{ color: RULE, margin: "0 22px" }}>{"\u00B7"}</span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
