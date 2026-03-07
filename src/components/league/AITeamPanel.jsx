import React, { useState } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { getOverall, getAttrColor } from "../../utils/calc.js";
import { TEAM_TRAITS } from "../../data/leagues.js";
import { ClubBadge } from "../ui/ClubBadge.jsx";
import { PositionChip } from "../ui/PositionChip.jsx";

const POSITION_ORDER = ["GK", "LB", "CB", "RB", "CM", "AM", "LW", "RW", "ST"];

function sortByPosition(players) {
  return [...players].sort((a, b) => {
    const ai = POSITION_ORDER.indexOf(a.position);
    const bi = POSITION_ORDER.indexOf(b.position);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function relColor(pct, alpha = 1) {
  const t = Math.max(0, Math.min(100, pct)) / 100;
  const r = Math.round(100 - 26 * t);
  const g = Math.round(116 + 106 * t);
  const b = Math.round(139 - 11 * t);
  return alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`;
}

function XpBar({ pct, color, height = 6 }) {
  return (
    <div style={{
      height, background: C.bgCard, position: "relative", overflow: "hidden",
      borderRadius: 2,
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`,
        background: color, transition: "width 0.3s ease",
      }} />
    </div>
  );
}

function PlayerRow({ player, matchGoals, seasonGoals, seasonAssists, onPlayerClick, ovrCap = 20 }) {
  const ovr = getOverall(player);
  const mg = matchGoals?.[player.name] || 0;
  const sg = seasonGoals?.[player.name] || 0;
  const sa = seasonAssists?.[player.name] || 0;
  return (
    <div
      onClick={() => onPlayerClick && onPlayerClick(player)}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "7px 6px",
        borderBottom: `1px solid ${C.bgCard}`,
        cursor: onPlayerClick ? "pointer" : "default",
        transition: "background 0.1s ease",
      }}
    >
      <PositionChip position={player.position} mobile={window.innerWidth <= 768} />
      <span style={{
        flex: 1, fontSize: F.sm, color: C.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{player.name}</span>
      {mg > 0 && (
        <span style={{ fontSize: F.xs, color: C.amber, flexShrink: 0 }}>
          ⚽{mg > 1 ? mg : ""}
        </span>
      )}
      {sg > 0 && (
        <span style={{ fontSize: F.xs, color: C.blue, flexShrink: 0 }}>{sg}G</span>
      )}
      {sa > 0 && (
        <span style={{ fontSize: F.xs, color: "#818cf8", flexShrink: 0 }}>{sa}A</span>
      )}
      <span style={{
        fontSize: F.md, color: getAttrColor(ovr, ovrCap), fontWeight: "bold",
        minWidth: 20, textAlign: "right", flexShrink: 0,
      }}>{ovr}</span>
    </div>
  );
}

export function AITeamPanel({
  team,
  tableRow,
  matchGoals,     // { playerName: goalsInThisMatch } — from match result
  seasonGoals,    // { playerName: goalsThisSeason } — from leagueStats
  seasonAssists,  // { playerName: assistsThisSeason } — from leagueStats
  onClose,
  onPlayerClick,  // optional: (player) => void — opens player profile
  // Relationship focus (optional — omit to hide the widget)
  clubRelationships,
  transferFocus,
  onSetFocus,
  onRemoveFocus,
  onReplaceFocus,
  ovrCap = 20,
}) {
  const mob = window.innerWidth <= 768;
  const teamColor = team.color || C.textMuted;
  const starters = sortByPosition((team.squad || []).filter(p => !p.isBench));
  const bench = (team.squad || []).filter(p => p.isBench);
  const gd = tableRow ? tableRow.goalsFor - tableRow.goalsAgainst : null;

  const [showReplace, setShowReplace] = useState(false);

  const hasFocusWidget = transferFocus && onSetFocus && onRemoveFocus;
  const isInFocus = hasFocusWidget && transferFocus.includes(team.name);
  const isPlayerTeam = team.isPlayer;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: Z.panelOver,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.88)",
        fontFamily: FONT,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(170deg, #0f172a 0%, #0a0a1a 50%, #0f172a 100%)",
          border: `2px solid ${teamColor}`,
          maxWidth: mob ? "95vw" : 800, width: mob ? "95%" : "80%",
          maxHeight: "88vh", display: "flex", flexDirection: "column",
          boxShadow: `0 0 50px ${teamColor}22`,
        }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${teamColor}18, transparent)`,
          borderBottom: `1px solid ${teamColor}33`,
          padding: mob ? "14px 16px" : "18px 28px",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: mob ? 10 : 14 }}>
            <ClubBadge name={team.name} color={team.color} size={mob ? 42 : 56} />
            <div>
              <div style={{ fontSize: mob ? F.xl : F.h3, color: teamColor, marginBottom: 6 }}>
                {team.name}
              </div>
              {team.trait && TEAM_TRAITS[team.trait] && (
                <div style={{ fontSize: F.xs, color: C.textDim }}>
                  {TEAM_TRAITS[team.trait].icon} {TEAM_TRAITS[team.trait].label}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: `1px solid ${teamColor}33`,
              color: C.textDim, fontSize: F.md, cursor: "pointer",
              padding: "8px 14px", fontFamily: FONT,
              flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* Table stats */}
        {tableRow && (
          <div style={{
            display: "flex", gap: mob ? 12 : 24, padding: "12px 24px",
            borderBottom: `1px solid ${C.bgCard}`, flexShrink: 0, flexWrap: "wrap",
          }}>
            {[
              ["P",   tableRow.played,    C.textMuted],
              ["W",   tableRow.won,       C.green],
              ["D",   tableRow.drawn,     C.amber],
              ["L",   tableRow.lost,      C.red],
              ["GF",  tableRow.goalsFor,  C.textMuted],
              ["GD",  gd > 0 ? `+${gd}` : gd, gd > 0 ? C.green : gd < 0 ? C.red : C.textMuted],
              ["PTS", tableRow.points,    teamColor],
            ].map(([label, val, color]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: F.xs, color: C.slate, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: F.md, color: color, fontWeight: "bold" }}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Relationship Focus Widget */}
        {hasFocusWidget && !isPlayerTeam && (
          <div style={{
            padding: mob ? "12px 14px" : "14px 24px",
            borderBottom: `1px solid ${C.bgCard}`, flexShrink: 0,
          }}>
            <div style={{ fontSize: F.xs, color: C.slate, letterSpacing: 2, marginBottom: 10 }}>
              RELATIONSHIP FOCUS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[0, 1].map(slotIdx => {
                const name = transferFocus[slotIdx];
                const entry = name ? (clubRelationships?.[name] || { pct: 0 }) : null;
                if (name) {
                  const isThisTeam = name === team.name;
                  const pct = entry.pct || 0;
                  const col = relColor(pct);
                  return (
                    <div key={slotIdx} style={{
                      padding: mob ? "8px 8px" : "9px 12px",
                      border: `1px solid ${isThisTeam ? teamColor + "66" : C.bgCard}`,
                      background: isThisTeam ? `${teamColor}08` : "rgba(15,15,35,0.3)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        <span style={{
                          fontSize: F.micro, color: C.slate, flexShrink: 0,
                        }}>S{slotIdx + 1}</span>
                        <span style={{
                          flex: 1, fontSize: mob ? F.micro : F.xs, color: isThisTeam ? teamColor : col,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{name}</span>
                        <span style={{ fontSize: F.micro, color: col, flexShrink: 0 }}>
                          {pct.toFixed(0)}%
                        </span>
                        <button
                          onClick={() => { onRemoveFocus(name); setShowReplace(false); }}
                          style={{
                            background: "transparent", border: "none",
                            color: C.slate, fontSize: F.xs, cursor: "pointer",
                            padding: "0 2px", fontFamily: FONT,
                            flexShrink: 0,
                          }}
                        >✕</button>
                      </div>
                      <XpBar pct={pct} color={col} height={5} />
                    </div>
                  );
                } else {
                  return (
                    <div key={slotIdx} style={{
                      padding: mob ? "8px 8px" : "9px 12px",
                      border: `1px solid ${C.bgCard}`,
                      background: "rgba(15,15,35,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      minHeight: 44,
                    }}>
                      <span style={{ fontSize: F.micro, color: C.bgCard }}>EMPTY</span>
                    </div>
                  );
                }
              })}
            </div>

            {/* Action button for this team */}
            {isInFocus ? (
              <div style={{
                fontSize: F.xs, color: C.slate, textAlign: "center",
                padding: "6px 0",
              }}>
                IN FOCUS
              </div>
            ) : !showReplace ? (
              <button
                onClick={() => {
                  if (transferFocus.length < 2) {
                    onSetFocus(team.name);
                  } else {
                    setShowReplace(true);
                  }
                }}
                style={{
                  width: "100%", padding: "8px 12px",
                  background: `${teamColor}11`, border: `1px solid ${teamColor}44`,
                  color: teamColor, fontSize: F.xs, cursor: "pointer",
                  fontFamily: FONT,
                }}
              >
                SET AS FOCUS
              </button>
            ) : (
              <div>
                <div style={{ fontSize: F.micro, color: C.textMuted, marginBottom: 8, lineHeight: 1.8 }}>
                  Both slots full. Replace which?
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {transferFocus.map((fname, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        onReplaceFocus(idx, team.name);
                        setShowReplace(false);
                      }}
                      style={{
                        flex: 1, padding: "7px 8px",
                        background: "rgba(239,68,68,0.08)", border: "1px solid #ef444444",
                        color: C.red, fontSize: F.micro, cursor: "pointer",
                        fontFamily: FONT,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      S{idx + 1}: {fname}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowReplace(false)}
                  style={{
                    width: "100%", marginTop: 6, padding: "6px 8px",
                    background: "transparent", border: `1px solid ${C.bgCard}`,
                    color: C.slate, fontSize: F.micro, cursor: "pointer",
                    fontFamily: FONT,
                  }}
                >CANCEL</button>
              </div>
            )}
          </div>
        )}

        {/* Squad */}
        <div style={{ overflow: "auto", flex: 1, padding: mob ? "14px 14px" : "16px 24px" }}>
          <div style={{ fontSize: F.xs, color: C.slate, letterSpacing: 2, marginBottom: 10 }}>
            STARTING XI
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "0 16px", marginBottom: 20,
          }}>
            {starters.map(p => (
              <PlayerRow
                key={p.name} player={p}
                matchGoals={matchGoals}
                seasonGoals={seasonGoals}
                seasonAssists={seasonAssists}
                onPlayerClick={onPlayerClick}
                ovrCap={ovrCap}
              />
            ))}
          </div>

          {bench.length > 0 && (
            <>
              <div style={{
                fontSize: F.xs, color: C.bgInput, letterSpacing: 2,
                marginBottom: 10, borderTop: `1px solid ${C.bgCard}`, paddingTop: 12,
              }}>
                BENCH
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                {bench.map(p => (
                  <PlayerRow
                    key={p.name} player={p}
                    matchGoals={matchGoals}
                    seasonGoals={seasonGoals}
                    seasonAssists={seasonAssists}
                    onPlayerClick={onPlayerClick}
                    ovrCap={ovrCap}
                  />
                ))}
              </div>
            </>
          )}

          {/* Legend */}
          {(matchGoals || seasonGoals || seasonAssists) && (
            <div style={{
              display: "flex", gap: 16, paddingTop: 14, marginTop: 10,
              borderTop: `1px solid ${C.bgCard}`, flexWrap: "wrap",
            }}>
              {matchGoals && (
                <span style={{ fontSize: F.xs, color: C.textDim }}>
                  <span style={{ color: C.amber }}>⚽</span> Scored this match
                </span>
              )}
              {seasonGoals && (
                <span style={{ fontSize: F.xs, color: C.textDim }}>
                  <span style={{ color: C.blue }}>G</span> Season goals
                </span>
              )}
              {seasonAssists && (
                <span style={{ fontSize: F.xs, color: C.textDim }}>
                  <span style={{ color: "#818cf8" }}>A</span> Season assists
                </span>
              )}
              <span style={{ fontSize: F.xs, color: C.textDim }}>
                <span style={{ color: "#22c55e" }}>OVR</span> Overall
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
