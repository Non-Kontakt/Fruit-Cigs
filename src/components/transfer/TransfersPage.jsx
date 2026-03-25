import React, { useState, useMemo, useEffect } from "react";
import { LEAGUE_DEFS, NUM_TIERS } from "../../data/leagues.js";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";
import { getOverall } from "../../utils/calc.js";
import { generateTradeId } from "../../utils/transfer.js";
import { AITeamPanel } from "../league/AITeamPanel.jsx";
import { ClubBadge } from "../ui/ClubBadge.jsx";
import { PlayerPanel } from "../player/PlayerPanel.jsx";
import { PlayerSearch } from "./PlayerSearch.jsx";
import { TradeProposal } from "./TradeProposal.jsx";
import { OffersPanel } from "./OffersPanel.jsx";
import { TradeHistory } from "./TradeHistory.jsx";
import { ShortlistPanel } from "./ShortlistPanel.jsx";

// Interpolate #64748b → #4ade80 based on pct 0–100.
function relColor(pct, alpha = 1) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const r = Math.round(100 - 26 * t);
  const g = Math.round(116 + 106 * t);
  const b = Math.round(139 - 11 * t);
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
}

function relLabel(pct) {
  if (pct >= 80) return "Allied";
  if (pct >= 60) return "Close";
  if (pct >= 40) return "Friendly";
  if (pct >= 20) return "Known";
  return "Strangers";
}

function weeklyNet(entry, isFocus, playerTier, inLeague) {
  const dist = Math.abs((entry.tier || playerTier) - playerTier);
  const decay = isFocus ? 0 : (dist === 0 ? 0.2 : dist === 1 ? 0.4 : dist <= 3 ? 0.8 : 1.4);
  const passive = inLeague ? 0.6 : 0;
  const focus = isFocus ? 3.0 : 0;
  return focus + passive - decay;
}

function XpBar({ pct, color, height = 6 }) {
  return (
    <div style={{
      height, background: C.bgCard, flex: 1, position: "relative", overflow: "hidden",
      borderRadius: 2,
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`,
        background: color,
        transition: "width 0.3s ease",
        borderRadius: 2,
      }} />
    </div>
  );
}

const TABS = ["PLAYER SEARCH", "RELATIONS", "OFFERS IN", "SHORTLIST", "HISTORY"];

export function TransfersPage({
  clubRelationships, setClubRelationships,
  transferFocus, setTransferFocus,
  league, allLeagueStates, leagueTier, teamName, clubHistory, squad,
  leagueResults, playerSeasonStats, playerRatingTracker,
  // New props for trade system
  transferOffers, setTransferOffers,
  transferHistory, setTransferHistory,
  transferWindowOpen, transferWindowWeeksRemaining,
  setSquad, setAllLeagueStates,
  seasonNumber, week,
  startingXI, setStartingXI,
  onPlayerClick, onTeamClick,
  shortlist, setShortlist, onToggleShortlist,
  pendingTradeTarget, onClearPendingTrade,
  scoutedPlayers,
  onTradeComplete,
  ovrCap,
}) {
  const [activeTab, setActiveTab] = useState("PLAYER SEARCH");
  const [expandedClub, setExpandedClub] = useState(null);
  const [confirmFocus, setConfirmFocus] = useState(null);
  const [viewSquad, setViewSquad] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null); // AI player profile
  const [tradeTarget, setTradeTarget] = useState(null); // { player, club } for TradeProposal
  const [relSortCol,  setRelSortCol]  = useState(null); // null | "club" | "league" | "status" | "pct" | "wk"
  const [relSortDir,  setRelSortDir]  = useState("desc");
  const mob = useMobile();

  function handleRelSort(col) {
    if (relSortCol !== col) {
      setRelSortCol(col);
      setRelSortDir("asc");
    } else if (relSortDir === "asc") {
      setRelSortDir("desc");
    } else {
      setRelSortCol(null);
      setRelSortDir("desc");
    }
  }
  const relIndicator = (col) => relSortCol === col ? (relSortDir === "asc" ? " ↑" : " ↓") : "";
  const relHStyle = (col) => ({
    cursor: "pointer", userSelect: "none",
    color: relSortCol === col ? C.green : C.bgInput,
    fontFamily: FONT, fontSize: F.micro,
  });

  // Open trade proposal if navigated here with a pending target from global player panel
  useEffect(() => {
    if (pendingTradeTarget) {
      setTradeTarget(pendingTradeTarget);
      onClearPendingTrade?.();
    }
  }, [pendingTradeTarget]);

  const highestTierReached = useMemo(() => {
    return [leagueTier, ...(clubHistory?.seasonArchive || []).map(s => s.tier || NUM_TIERS)]
      .filter(t => t != null)
      .reduce((min, t) => Math.min(min, t), NUM_TIERS);
  }, [leagueTier, clubHistory]);

  const visibleTiers = useMemo(() =>
    Array.from({ length: NUM_TIERS }, (_, i) => i + 1)
      .filter(t => t >= 5 || t >= highestTierReached),
    [highestTierReached]);

  const allClubs = useMemo(() => {
    const clubs = [];
    for (const tier of visibleTiers) {
      const tierTeams = tier === leagueTier
        ? (league?.teams || [])
        : (allLeagueStates?.[tier]?.teams || LEAGUE_DEFS[tier]?.teams || []);
      for (const team of tierTeams) {
        if (team.isPlayer) continue;
        clubs.push({ name: team.name, tier, color: team.color, squad: team.squad });
      }
    }
    return clubs;
  }, [visibleTiers, allLeagueStates, league, leagueTier]);

  const leagueTeamNames = useMemo(() =>
    (league?.teams || []).filter(t => !t.isPlayer).map(t => t.name),
    [league]);

  const sortedClubs = useMemo(() => {
    const leagueSet = new Set(leagueTeamNames);
    const STATUS_ORDER = { Strangers: 0, Known: 1, Friendly: 2, Close: 3, Allied: 4 };
    const enriched = allClubs.map(club => {
      const entry = clubRelationships[club.name] || { pct: 0, tier: club.tier };
      const inLeague = leagueSet.has(club.name);
      const isFocus = transferFocus.includes(club.name);
      const net = weeklyNet({ tier: club.tier }, isFocus, leagueTier, inLeague);
      return { ...club, pct: entry.pct, relTier: entry.tier, inLeague, net };
    });

    if (!relSortCol) {
      // Default sort: pct desc, then same-league first, then tier distance, then name
      return enriched.sort((a, b) => {
        if (b.pct !== a.pct) return b.pct - a.pct;
        const aL = a.inLeague ? 0 : 1;
        const bL = b.inLeague ? 0 : 1;
        if (aL !== bL) return aL - bL;
        const aDist = Math.abs(a.tier - leagueTier);
        const bDist = Math.abs(b.tier - leagueTier);
        if (aDist !== bDist) return aDist - bDist;
        return a.name.localeCompare(b.name);
      });
    }

    const dir = relSortDir === "asc" ? 1 : -1;
    return enriched.sort((a, b) => {
      if (relSortCol === "club")   return dir * a.name.localeCompare(b.name);
      if (relSortCol === "league") return dir * (a.tier - b.tier);
      if (relSortCol === "status") return dir * ((STATUS_ORDER[relLabel(a.pct)] || 0) - (STATUS_ORDER[relLabel(b.pct)] || 0));
      if (relSortCol === "pct")    return dir * (a.pct - b.pct);
      if (relSortCol === "wk")     return dir * (a.net - b.net);
      return 0;
    });
  }, [allClubs, clubRelationships, leagueTeamNames, leagueTier, transferFocus, relSortCol, relSortDir]);

  const focusEntries = transferFocus.map(name => ({
    name,
    entry: clubRelationships[name] || { pct: 0, tier: leagueTier },
  }));

  const tabStyle = (tab) => ({
    padding: mob ? "10px 13px" : "10px 18px",
    fontSize: mob ? F.xs : F.sm,
    cursor: "pointer",
    fontFamily: FONT,
    background: activeTab === tab ? "rgba(74,222,128,0.1)" : "transparent",
    border: activeTab === tab ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
    color: activeTab === tab ? C.green : C.textDim,
    borderRadius: 20,
    flex: mob ? "1 1 auto" : undefined,
    textAlign: "center",
  });

  const handleSetFocus = (clubName) => {
    if (transferFocus.includes(clubName)) return;
    if (transferFocus.length < 2) {
      setTransferFocus([...transferFocus, clubName]);
      setExpandedClub(null);
    } else {
      setConfirmFocus(clubName);
    }
  };

  const handleRemoveFocus = (clubName) => {
    setTransferFocus(transferFocus.filter(n => n !== clubName));
  };

  // --- Player Search click → open AI player profile ---
  const handlePlayerClick = (player) => {
    // player has clubName, clubColor, clubTier from PlayerSearch's allPlayers
    setSelectedPlayer(player);
  };

  // --- Open trade proposal for a specific AI player ---
  const handleMakeOffer = (player) => {
    const club = allClubs.find(c => c.name === player.clubName);
    setTradeTarget({
      player,
      clubName: player.clubName,
      clubColor: player.clubColor || club?.color || C.textMuted,
      clubTier: player.clubTier || club?.tier || leagueTier,
      squad: club?.squad || [],
    });
    setSelectedPlayer(null);
  };

  // --- Execute trade: swap players between squads ---
  const handleTradeConfirm = ({ offered, received }) => {
    const offeredIds = new Set(offered.map(p => p.id));
    const receivedIds = new Set(received.map(p => p.id));
    const targetClubName = tradeTarget.clubName;

    // Remove offered players from user squad, add received
    setSquad(prev => {
      const updated = prev.filter(p => !offeredIds.has(p.id));
      const incoming = received.map(p => ({
        ...p,
        clubName: undefined,
        clubColor: undefined,
        clubTier: undefined,
        isOwnPlayer: undefined,
        ovr: undefined,
        // Default to balanced training so transferred players still improve
        training: "balanced",
        positionTraining: null,
        statProgress: {},
        gains: {},
        history: p.history || [],
        seasonStartOvr: getOverall(p),
        seasonStartAttrs: { ...p.attrs },
      }));
      return [...updated, ...incoming];
    });

    // Remove offered from startingXI if applicable
    if (startingXI && setStartingXI) {
      setStartingXI(prev => prev.filter(id => !offeredIds.has(id)));
    }

    // Update AI squad in allLeagueStates
    if (setAllLeagueStates) {
      setAllLeagueStates(prev => {
        const updated = { ...prev };
        for (const tier in updated) {
          const state = updated[tier];
          if (!state?.teams) continue;
          const teamIdx = state.teams.findIndex(t => t.name === targetClubName && !t.isPlayer);
          if (teamIdx === -1) continue;
          const team = { ...state.teams[teamIdx] };
          team.squad = (team.squad || [])
            .filter(p => !receivedIds.has(p.id))
            .concat(offered.map(p => ({
              ...p,
              clubName: undefined, clubColor: undefined, clubTier: undefined,
              isOwnPlayer: undefined, ovr: undefined,
              training: null, positionTraining: null, statProgress: {}, gains: {},
            })));
          const newTeams = [...state.teams];
          newTeams[teamIdx] = team;
          updated[tier] = { ...state, teams: newTeams };
          break;
        }
        return updated;
      });
    }

    // Log to history
    const trade = {
      id: generateTradeId(seasonNumber || 1, week || 1),
      season: seasonNumber || 1,
      week: week || 1,
      aiClubName: targetClubName,
      aiClubColor: tradeTarget.clubColor,
      offered: offered.map(p => ({ id: p.id, name: p.name, position: p.position, attrs: p.attrs, age: p.age })),
      received: received.map(p => ({ id: p.id, name: p.name, position: p.position, attrs: p.attrs, age: p.age })),
    };
    if (setTransferHistory) setTransferHistory(prev => [...prev, trade]);
    if (onTradeComplete) onTradeComplete(targetClubName);

    setTradeTarget(null);
  };

  // --- Offers IN handlers ---
  const handleAcceptOffer = (offer, idx) => {
    // Treat as auto-trade: swap players directly
    const offeredIds = new Set(offer.aiWants.map(p => p.id));
    const receivedIds = new Set(offer.aiOffers.map(p => p.id));

    setSquad(prev => {
      const updated = prev.filter(p => !offeredIds.has(p.id));
      const incoming = offer.aiOffers.map(p => ({
        ...p, training: "balanced", positionTraining: null, statProgress: {}, gains: {}, history: p.history || [],
        seasonStartOvr: getOverall(p),
        seasonStartAttrs: { ...p.attrs },
      }));
      return [...updated, ...incoming];
    });

    if (startingXI && setStartingXI) {
      setStartingXI(prev => prev.filter(id => !offeredIds.has(id)));
    }

    if (setAllLeagueStates) {
      setAllLeagueStates(prev => {
        const updated = { ...prev };
        for (const tier in updated) {
          const state = updated[tier];
          if (!state?.teams) continue;
          const teamIdx = state.teams.findIndex(t => t.name === offer.aiClubName && !t.isPlayer);
          if (teamIdx === -1) continue;
          const team = { ...state.teams[teamIdx] };
          team.squad = (team.squad || [])
            .filter(p => !receivedIds.has(p.id))
            .concat(offer.aiWants.map(p => ({
              ...p, training: null, positionTraining: null, statProgress: {}, gains: {},
            })));
          const newTeams = [...state.teams];
          newTeams[teamIdx] = team;
          updated[tier] = { ...state, teams: newTeams };
          break;
        }
        return updated;
      });
    }

    const trade = {
      id: generateTradeId(seasonNumber || 1, week || 1),
      season: seasonNumber || 1, week: week || 1,
      aiClubName: offer.aiClubName, aiClubColor: offer.aiClubColor,
      offered: offer.aiWants.map(p => ({ id: p.id, name: p.name, position: p.position, attrs: p.attrs, age: p.age })),
      received: offer.aiOffers.map(p => ({ id: p.id, name: p.name, position: p.position, attrs: p.attrs, age: p.age })),
    };
    if (setTransferHistory) setTransferHistory(prev => [...prev, trade]);
    if (onTradeComplete) onTradeComplete(offer.aiClubName);
    if (setTransferOffers) setTransferOffers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRejectOffer = (idx) => {
    if (setTransferOffers) setTransferOffers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCounterOffer = (offer) => {
    // Open TradeProposal pre-filled with the AI's suggested players
    const club = allClubs.find(c => c.name === offer.aiClubName);
    setTradeTarget({
      player: offer.aiOffers[0], // pre-select their offered player
      clubName: offer.aiClubName,
      clubColor: offer.aiClubColor || club?.color || C.textMuted,
      clubTier: offer.aiClubTier || club?.tier || leagueTier,
      squad: club?.squad || [],
    });
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
            {tab}
            {tab === "OFFERS IN" && transferOffers?.length > 0 && (
              <span style={{
                marginLeft: 6, background: C.red, color: "#fff",
                borderRadius: "50%", padding: "2px 6px", fontSize: F.micro,
              }}>{transferOffers.length}</span>
            )}
            {tab === "SHORTLIST" && shortlist?.length > 0 && (
              <span style={{
                marginLeft: 6, background: C.gold, color: C.bg,
                borderRadius: "50%", padding: "2px 6px", fontSize: F.micro,
              }}>{shortlist.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: C.bg, border: `1px solid ${C.bgCard}` }}>

        {/* ===== RELATIONS TAB ===== */}
        {activeTab === "RELATIONS" && (
          <div style={{ padding: mob ? "16px 10px" : "20px" }}>

            {/* Active Focus — 2 slots */}
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[0, 1].map(slotIdx => {
                const focusData = focusEntries[slotIdx];
                if (focusData) {
                  const fc = allClubs.find(c => c.name === focusData.name);
                  return (
                    <div key={slotIdx} style={{
                      padding: "13px 16px",
                      border: `1px solid ${relColor(focusData.entry.pct, 0.33)}`,
                      borderLeft: `3px solid ${relColor(focusData.entry.pct)}`,
                      background: "rgba(74,222,128,0.04)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <ClubBadge name={focusData.name} color={fc?.color} size={28} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: F.xs, color: relColor(focusData.entry.pct), marginBottom: 2 }}>
                            {focusData.name}
                          </div>
                          <div style={{ fontSize: F.micro, color: C.textDim }}>
                            {LEAGUE_DEFS[focusData.entry.tier]?.shortName ?? `T${focusData.entry.tier}`} · +3.0%/wk
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: F.lg, color: relColor(focusData.entry.pct), fontWeight: "bold" }}>
                            {focusData.entry.pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <XpBar pct={focusData.entry.pct} color={relColor(focusData.entry.pct)} height={8} />
                      <button
                        onClick={() => handleRemoveFocus(focusData.name)}
                        style={{
                          marginTop: 6, background: "transparent", border: `1px solid ${C.bgInput}`,
                          color: C.textDim, fontSize: F.micro, cursor: "pointer", width: "100%",
                          padding: "6px 8px", fontFamily: FONT,
                        }}
                      >REMOVE</button>
                    </div>
                  );
                } else {
                  return (
                    <div key={slotIdx} style={{
                      padding: "13px 16px",
                      border: `1px solid ${C.bgCard}`,
                      background: "rgba(15,15,35,0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 130,
                    }}>
                      <div style={{ fontSize: F.xs, color: C.bgInput, textAlign: "center" }}>
                        Slot {slotIdx + 1} Empty<br/>Select a club below
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {/* Club list */}
            <div style={{ fontSize: F.xs, color: C.slate, letterSpacing: 2, marginBottom: 10 }}>
              ALL CLUBS ({sortedClubs.length})
            </div>

            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mob ? "1fr 50px 64px 76px 36px" : "1fr 64px 76px 90px 76px 36px",
              padding: "8px 10px", fontSize: F.micro, color: C.bgInput,
              borderBottom: `1px solid ${C.bgCard}`, gap: 4,
            }}>
              <span onClick={() => handleRelSort("club")} style={relHStyle("club")}>CLUB{relIndicator("club")}</span>
              <span onClick={() => handleRelSort("league")} style={{ ...relHStyle("league"), textAlign: "center" }}>LEAGUE{relIndicator("league")}</span>
              <span onClick={() => handleRelSort("status")} style={{ ...relHStyle("status"), textAlign: "center" }}>STATUS{relIndicator("status")}</span>
              <span onClick={() => handleRelSort("pct")} style={{ ...relHStyle("pct"), textAlign: "right" }}>%{relIndicator("pct")}</span>
              {!mob && <span onClick={() => handleRelSort("wk")} style={{ ...relHStyle("wk"), textAlign: "right" }}>/WK{relIndicator("wk")}</span>}
              <span></span>
            </div>

            {sortedClubs.map(club => {
              const isFocus = transferFocus.includes(club.name);
              const isExpanded = expandedClub === club.name;
              const color = relColor(club.pct);
              const label = relLabel(club.pct);
              const inLeague = leagueTeamNames.includes(club.name);
              const net = weeklyNet({ tier: club.tier }, isFocus, leagueTier, inLeague);
              const netStr = net >= 0 ? `+${net.toFixed(1)}` : net.toFixed(1);
              const netColor = net > 0 ? C.green : net < 0 ? C.red : C.textDim;

              return (
                <div key={club.name}>
                  <div
                    onClick={() => setExpandedClub(isExpanded ? null : club.name)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: mob ? "1fr 50px 64px 76px 36px" : "1fr 64px 76px 90px 76px 36px",
                      padding: "13px 10px",
                      borderBottom: isExpanded ? "none" : `1px solid ${C.bgCard}`,
                      borderLeft: `3px solid ${color}`,
                      background: isFocus
                        ? "rgba(74,222,128,0.06)"
                        : isExpanded ? "rgba(30,41,59,0.4)" : "transparent",
                      cursor: "pointer",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <ClubBadge name={club.name} color={club.color} size={mob ? 22 : 26} />
                      <div style={{ overflow: "hidden", flex: 1 }}>
                        <div style={{
                          fontSize: mob ? F.xs : F.sm, color,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {isFocus && <span style={{ fontSize: F.xs, marginRight: 4 }}>★</span>}
                          <span onClick={(e) => { e.stopPropagation(); onTeamClick?.(club.name); }} style={{ cursor: "pointer" }}>{club.name}</span>
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <XpBar pct={club.pct} color={color} height={4} />
                        </div>
                      </div>
                    </div>
                    <span style={{
                      textAlign: "center", fontSize: F.xs,
                      color: inLeague ? C.gold : C.slate,
                    }}>
                      {LEAGUE_DEFS[club.tier]?.shortName ?? `T${club.tier}`}
                    </span>
                    <span style={{ textAlign: "center", fontSize: mob ? F.micro : F.xs, color }}>
                      {label}
                    </span>
                    <span style={{ textAlign: "right", fontSize: F.md, color, fontWeight: "bold" }}>
                      {club.pct.toFixed(1)}%
                    </span>
                    {!mob && (
                      <span style={{ textAlign: "right", fontSize: F.xs, color: netColor }}>
                        {netStr}
                      </span>
                    )}
                    {club.squad?.length > 0 ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewSquad(club); }}
                        style={{
                          background: "transparent", border: `1px solid ${C.bgCard}`,
                          color: C.slate, fontSize: F.micro, cursor: "pointer",
                          padding: "4px 7px", fontFamily: FONT,
                          lineHeight: 1,
                        }}
                        title="View squad"
                      >👥</button>
                    ) : (
                      <span />
                    )}
                  </div>

                  {isExpanded && (
                    <div style={{
                      padding: "13px 20px 18px",
                      borderBottom: `1px solid ${C.bgCard}`,
                      background: "rgba(30,41,59,0.3)",
                      display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                    }}>
                      <div style={{ fontSize: F.xs, color: C.textDim, flex: 1 }}>
                        {inLeague ? "Same league" : (LEAGUE_DEFS[club.tier]?.shortName ?? `Tier ${club.tier}`)}
                        {" · "}
                        Weekly: <span style={{ color: netColor }}>{netStr}%</span>
                        {isFocus ? " (in focus)" : " (unfocused)"}
                      </div>
                      {club.squad?.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewSquad(club); setExpandedClub(null); }}
                          style={{
                            background: "transparent", border: `1px solid ${C.bgInput}`,
                            color: C.textMuted, fontSize: F.xs, cursor: "pointer",
                            padding: "8px 13px", fontFamily: FONT,
                          }}
                        >VIEW SQUAD</button>
                      )}
                      {isFocus ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFocus(club.name); setExpandedClub(null); }}
                          style={{
                            background: "transparent", border: `1px solid ${C.slate}`,
                            color: C.textDim, fontSize: F.xs, cursor: "pointer",
                            padding: "8px 13px", fontFamily: FONT,
                          }}
                        >REMOVE FOCUS</button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSetFocus(club.name); }}
                          style={{
                            background: "rgba(74,222,128,0.1)", border: "1px solid #4ade8066",
                            color: C.green, fontSize: F.xs, cursor: "pointer",
                            padding: "8px 13px", fontFamily: FONT,
                          }}
                        >IMPROVE RELATIONS</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Legend */}
            <div style={{
              marginTop: 16, padding: "13px 10px",
              borderTop: `1px solid ${C.bgCard}`,
              display: "flex", gap: 16, flexWrap: "wrap",
            }}>
              {[["Strangers", 0], ["Known", 20], ["Friendly", 40], ["Close", 60], ["Allied", 80]].map(([lbl, p]) => (
                <span key={lbl} style={{ fontSize: F.micro, color: relColor(p) }}>■ {lbl} ({p}%+)</span>
              ))}
            </div>
          </div>
        )}

        {/* ===== PLAYER SEARCH TAB ===== */}
        {activeTab === "PLAYER SEARCH" && (
          <PlayerSearch
            allClubs={allClubs}
            squad={squad}
            teamName={teamName}
            leagueTier={leagueTier}
            visibleTiers={visibleTiers}
            league={league}
            leagueResults={leagueResults}
            playerSeasonStats={playerSeasonStats}
            playerRatingTracker={playerRatingTracker}
            onPlayerClick={handlePlayerClick}
            scoutedPlayers={scoutedPlayers}
            ovrCap={ovrCap}
          />
        )}

        {/* ===== OFFERS IN TAB ===== */}
        {activeTab === "OFFERS IN" && (
          <OffersPanel
            offers={transferOffers || []}
            onAccept={handleAcceptOffer}
            onReject={handleRejectOffer}
            onCounter={handleCounterOffer}
            mob={mob}
            onPlayerClick={onPlayerClick}
            ovrCap={ovrCap}
          />
        )}

        {/* ===== HISTORY TAB ===== */}
        {activeTab === "SHORTLIST" && (
          <ShortlistPanel
            shortlist={shortlist}
            setShortlist={setShortlist}
            onPlayerClick={onPlayerClick}
            onTeamClick={onTeamClick}
            mob={mob}
          />
        )}

        {activeTab === "HISTORY" && (
          <TradeHistory
            history={transferHistory || []}
            teamName={teamName}
            mob={mob}
            onPlayerClick={onPlayerClick}
            onTeamClick={onTeamClick}
            ovrCap={ovrCap}
          />
        )}
      </div>

      {/* Focus slot replacement modal */}
      {confirmFocus && (
        <div
          onClick={() => setConfirmFocus(null)}
          style={{
            position: "fixed", inset: 0, zIndex: Z.modal,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.88)",
            fontFamily: FONT,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#0f172a", border: `1px solid ${C.bgInput}`,
              padding: 24, maxWidth: 400, width: "90%",
            }}
          >
            <div style={{ fontSize: F.sm, color: C.gold, marginBottom: 12 }}>BOTH SLOTS FULL</div>
            <div style={{ fontSize: F.xs, color: C.textMuted, marginBottom: 16, lineHeight: 1.8 }}>
              You want to focus on <span style={{ color: C.green }}>{confirmFocus}</span>.
              Both slots are occupied. Which club should be replaced?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {transferFocus.map((name, idx) => {
                const entry = clubRelationships[name] || { pct: 0, tier: leagueTier };
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      const updated = [...transferFocus];
                      updated[idx] = confirmFocus;
                      setTransferFocus(updated);
                      setConfirmFocus(null);
                      setExpandedClub(null);
                    }}
                    style={{
                      background: "rgba(239,68,68,0.1)", border: "1px solid #ef444466",
                      color: C.red, fontSize: F.xs, cursor: "pointer", textAlign: "left",
                      padding: "10px 13px", fontFamily: FONT,
                    }}
                  >
                    Replace Slot {idx + 1}: {name} ({entry.pct.toFixed(1)}%)
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setConfirmFocus(null)}
              style={{
                width: "100%", background: "transparent", border: `1px solid ${C.bgInput}`,
                color: C.textDim, fontSize: F.xs, cursor: "pointer",
                padding: "10px", fontFamily: FONT,
              }}
            >CANCEL</button>
          </div>
        </div>
      )}

      {/* Squad view modal */}
      {viewSquad && (
        <AITeamPanel
          team={{ name: viewSquad.name, color: viewSquad.color || C.textMuted, squad: viewSquad.squad || [] }}
          tableRow={null}
          matchGoals={null}
          seasonGoals={null}
          seasonAssists={null}
          onClose={() => setViewSquad(null)}
          onPlayerClick={(player) => {
            // Attach club metadata so PlayerPanel/trade context can use it
            setSelectedPlayer({
              ...player,
              clubName: viewSquad.name,
              clubColor: viewSquad.color || C.textMuted,
              clubTier: viewSquad.tier || leagueTier,
              ovr: getOverall(player),
            });
          }}
          clubRelationships={clubRelationships}
          transferFocus={transferFocus}
          onSetFocus={handleSetFocus}
          onRemoveFocus={handleRemoveFocus}
          onReplaceFocus={(slotIdx, name) => {
            const updated = [...transferFocus];
            updated[slotIdx] = name;
            setTransferFocus(updated);
          }}
        />
      )}

      {/* AI Player Profile (PlayerPanel in read-only mode with trade context) */}
      {selectedPlayer && !tradeTarget && (() => {
        const rel = (clubRelationships[selectedPlayer.clubName] || {}).pct || 0;
        const leagueDef = LEAGUE_DEFS[selectedPlayer.clubTier];
        return (
          <PlayerPanel
            player={selectedPlayer}
            ovrCap={ovrCap}
            onClose={() => setSelectedPlayer(null)}
            onToggleShortlist={onToggleShortlist}
            shortlist={shortlist}
            tradeContext={{
              aiClubName: selectedPlayer.clubName,
              aiClubTier: selectedPlayer.clubTier,
              aiClubColor: selectedPlayer.clubColor,
              aiClubLeague: leagueDef?.shortName,
              relationship: rel,
              transferWindowOpen: !!transferWindowOpen,
              transferWindowWeeksRemaining,
              onMakeOffer: handleMakeOffer,
            }}
          />
        );
      })()}

      {/* Trade Proposal modal */}
      {tradeTarget && (
        <TradeProposal
          userSquad={squad || []}
          aiSquad={tradeTarget.squad || []}
          aiClubName={tradeTarget.clubName}
          aiClubColor={tradeTarget.clubColor}
          aiClubTier={tradeTarget.clubTier}
          relationship={(clubRelationships[tradeTarget.clubName] || {}).pct || 0}
          teamName={teamName}
          transferWindowWeeksRemaining={transferWindowWeeksRemaining}
          preSelectedPlayer={tradeTarget.player}
          onConfirm={handleTradeConfirm}
          onClose={() => setTradeTarget(null)}
          ovrCap={ovrCap}
        />
      )}
    </div>
  );
}
