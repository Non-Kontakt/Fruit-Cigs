import React, { useState } from "react";
import { ATTRIBUTES, TRAINING_FOCUSES } from "../../data/training.js";
import { ALL_POSITIONS } from "../../data/positions.js";
import { getOverall, getOvrProgress, getAttrColor, getPosColor, progressToPips, getPositionTrainingWeeks } from "../../utils/calc.js";
import { getNatFlag, getNatLabel } from "../../utils/player.js";
import { getPlayerValue, getRelationshipTier } from "../../utils/transfer.js";
import { Sparkline } from "../charts/Sparkline.jsx";
import { ClubBadge } from "../ui/ClubBadge.jsx";
import { F, C, FONT, Z } from "../../data/tokens";

export function PlayerPanel({ player, onAssignTraining, onAssignPositionTraining, onClose, onRelease, tradeContext, onToggleShortlist, shortlist, ovrCap = 20 }) {
  const effectiveCap = player.isLegend ? player.legendCap : ovrCap;
  const overall = getOverall(player);
  const ovrPips = Math.min(4, Math.floor(getOvrProgress(player) * 5)); // 0–4; 5 would mean already levelled up
  const [showChart, setShowChart] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const mob = window.innerWidth <= 768;
  const isShortlisted = shortlist?.some(p =>
    (p.id && p.id === player.id) || (p.name === player.name && p.clubName === (player.clubName || ""))
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.panelOver,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)",
      fontFamily: FONT,
    }} onClick={onClose}>
      <div style={{
        background: C.bg,
        border: `2px solid ${C.bgInput}`,
        padding: mob ? "26px 21px" : "37px 43px",
        maxWidth: 740,
        width: mob ? "96%" : "92%",
        maxHeight: "85vh",
        overflowY: "auto",
        boxShadow: "0 0 60px rgba(0,0,0,0.8)",
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 7 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  background: getPosColor(player.position),
                  color: C.bg,
                  padding: "6px 14px",
                  fontSize: mob ? F.lg : F.xl,
                  fontWeight: "bold",
                }}>
                  {player.position}
                </span>
                {player.learnedPositions?.map(lp => (
                  <span key={lp} style={{
                    background: getPosColor(lp),
                    color: C.bg,
                    padding: "6px 14px",
                    fontSize: mob ? F.lg : F.xl,
                    fontWeight: "bold",
                    opacity: 0.75,
                  }}>
                    {lp}
                  </span>
                ))}
              </span>
              <span style={{ color: C.text, fontSize: mob ? F.xl : F.h3 }}>{player.name}</span>
              {player.birthName && <span style={{ color: C.textDim, fontSize: F.xs, marginLeft: 6 }}>({player.birthName})</span>}
            </div>
            <div style={{ color: C.textDim, fontSize: mob ? F.xs : F.sm, display: "flex", alignItems: "center", flexWrap: "wrap", gap: mob ? 2 : 0 }}>
              <span style={{ fontSize: F.xl, lineHeight: 1, marginRight: 5 }}>{getNatFlag(player.nationality)}</span> {getNatLabel(player.nationality)} · Age {player.age} · OVR {overall}<span style={{ display: "inline-flex", gap: 2, marginLeft: 5, verticalAlign: "middle" }}>{[0,1,2,3,4].map(i => <span key={i} style={{ display: "inline-block", width: 9, height: 9, background: i < ovrPips ? C.blue : C.bgCard, border: `1px solid ${C.bgInput}` }} />)}</span> · POT {player.potential}
              {player.isTrial && (
                <span style={{ color: C.green, marginLeft: 9, background: "rgba(74,222,128,0.15)", padding: "3px 10px", fontSize: F.sm, border: "1px solid #4ade8044" }}>
                  🌍 ON TRIAL · {player.trialWeeksLeft}w left
                </span>
              )}
              {player.isProdigal && player.formerClub && (
                <span style={{ color: "#f59e0b", marginLeft: 9, fontSize: F.sm, opacity: 0.7 }}>
                  formerly at {player.formerClub}
                </span>
              )}
              {player.injury && (
                <span style={{ color: C.red, marginLeft: 9 }}>
                  🏥 {player.injury.name} ({player.injury.weeksLeft}w)
                </span>
              )}
              {player.tags?.length > 0 && player.tags.map(tag => (
                <span key={tag} style={{
                  marginLeft: 9, padding: "3px 10px", fontSize: F.sm,
                  background: tag === "Prodigy" ? "rgba(167,139,250,0.15)" : tag === "Veteran" ? "rgba(250,204,21,0.15)" : "rgba(96,165,250,0.15)",
                  color: tag === "Prodigy" ? "#a78bfa" : tag === "Veteran" ? C.amber : C.blue,
                  border: `1px solid ${tag === "Prodigy" ? "#a78bfa44" : tag === "Veteran" ? C.amber + "44" : C.blue + "44"}`,
                }}>
                  {tag === "Prodigy" ? "🧪" : tag === "Veteran" ? "🤝" : "©️"} {tag}
                </span>
              ))}
              {player.isLegend && (
                <span style={{
                  marginLeft: 9, padding: "3px 10px", fontSize: F.sm,
                  background: "rgba(251,191,36,0.15)", color: C.amber,
                  border: "1px solid rgba(251,191,36,0.3)",
                }}>
                  ★ Legend · P{player.legendPrestige} · {12 - (player.legendAppearances || 0)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {onToggleShortlist && (
              <button onClick={() => onToggleShortlist(player)} style={{
                background: isShortlisted ? "rgba(250,204,21,0.15)" : "transparent",
                border: isShortlisted ? `1px solid ${C.gold}` : `1px solid ${C.bgInput}`,
                color: isShortlisted ? C.gold : C.textDim,
                padding: "8px 17px", cursor: "pointer", fontSize: F.xl,
                fontFamily: FONT,
              }}>{isShortlisted ? "★" : "☆"}</button>
            )}
            <button onClick={onClose} style={{
              background: "none", border: `1px solid ${C.bgInput}`, color: C.textDim,
              padding: "8px 17px", cursor: "pointer", fontSize: F.xl,
              fontFamily: FONT,
            }}>✕</button>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: 7, marginBottom: 18 }}>
          <button onClick={() => setShowChart(false)} style={{
            background: !showChart ? "rgba(74,222,128,0.1)" : "transparent",
            border: !showChart ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
            color: !showChart ? C.green : C.slate,
            padding: "9px 17px", fontSize: F.md, cursor: "pointer",
            fontFamily: FONT,
          }}>STATS</button>
          <button onClick={() => setShowChart(true)} style={{
            background: showChart ? "rgba(74,222,128,0.1)" : "transparent",
            border: showChart ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
            color: showChart ? C.green : C.slate,
            padding: "9px 17px", fontSize: F.md, cursor: "pointer",
            fontFamily: FONT,
          }}>📈 PROGRESS</button>
        </div>

        {!showChart ? (
          <>
            {/* Attribute bars */}
            <div style={{ marginBottom: 28 }}>
              {ATTRIBUTES.map(attr => {
                const val = player.attrs[attr.key];
                const gained = player.gains?.[attr.key];
                const progress = player.statProgress?.[attr.key] || 0;
                const pips = progressToPips(progress);
                const showPips = val < effectiveCap && player.training && !player.injury;
                return (
                  <div key={attr.key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}>
                    <span style={{ color: attr.color, fontSize: F.lg, width: 51, textAlign: "right" }}>{attr.label}</span>
                    <div style={{ flex: 1, position: "relative" }}>
                      <div style={{ height: 21, background: C.bgCard, position: "relative", border: `1px solid ${C.bgInput}` }}>
                        <div style={{
                          height: "100%", width: `${Math.min(100, (val / effectiveCap) * 100)}%`,
                          background: `linear-gradient(90deg, ${attr.color}88, ${attr.color})`,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      {showPips && (
                        <div style={{ display: "flex", gap: 1, marginTop: 2, justifyContent: "flex-end" }}>
                          {[0,1,2,3,4].map(i => (
                            <span key={i} style={{
                              display: "inline-block", width: 7, height: 3,
                              background: i < pips ? (progress >= 0.8 ? "#38bdf8" : "#f59e0b") : "rgba(30,41,59,0.6)",
                              opacity: i < pips ? 1 : 0.3,
                            }} />
                          ))}
                          <span style={{ fontSize: F.xs, color: progress >= 0.8 ? "#38bdf8" : C.textDim, marginLeft: 3 }}>
                            {Math.round(progress * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <span style={{ color: getAttrColor(val, effectiveCap), fontSize: F.xl, width: 40, textAlign: "right" }}>{val}</span>
                    {gained && (
                      <span style={{ color: gained >= 2 ? C.gold : C.green, fontSize: F.lg, animation: "pulse 1s ease infinite" }}>▲+{gained}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {/* Progression charts */}
            <div style={{ marginBottom: 28 }}>
              {(player.history || []).length < 2 ? (
                <div style={{ color: C.slate, fontSize: F.lg, textAlign: "center", padding: "26px 0" }}>
                  Train for a few weeks to see progression data.
                </div>
              ) : (
                ATTRIBUTES.map(attr => {
                  const data = (player.history || []).map(h => h[attr.key]);
                  const current = player.attrs[attr.key];
                  const start = data[0];
                  return (
                    <div key={attr.key} style={{
                      display: "flex", alignItems: "center", gap: 12, marginBottom: 12,
                      padding: "8px 0",
                    }}>
                      <span style={{ color: attr.color, fontSize: F.lg, width: 51, textAlign: "right" }}>{attr.label}</span>
                      <Sparkline data={data} color={attr.color} ovrCap={effectiveCap} />
                      <span style={{ color: C.textDim, fontSize: F.md }}>
                        {start}→{current}
                      </span>
                    </div>
                  );
                })
              )}
              {(player.history || []).length >= 2 && (
                <div style={{ color: C.bgInput, fontSize: F.sm, textAlign: "center", marginTop: 9 }}>
                  {(player.history || []).length} weeks tracked
                </div>
              )}
            </div>
          </>
        )}

        {/* Injury notice */}
        {player.injury && (
          <div style={{
            padding: "16px 24px",
            marginBottom: 18,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            fontSize: F.lg,
            color: "#fca5a5",
            display: "flex", alignItems: "center", gap: 9,
          }}>
            🏥 <span>Injured: {player.injury.name} — out for {player.injury.weeksLeft} more week{player.injury.weeksLeft !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Training assignment (own players only) */}
        {onAssignTraining && (
          <>
            <div style={{ color: C.textMuted, fontSize: F.md, marginBottom: 10, letterSpacing: 1 }}>
              ASSIGN TRAINING
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {TRAINING_FOCUSES.map(tf => {
                const isActive = player.training === tf.key;
                const isInjured = !!player.injury;
                return (
                  <button
                    key={tf.key}
                    onClick={() => !isInjured && onAssignTraining(player.id, tf.key)}
                    style={{
                      background: isInjured ? "rgba(15,15,30,0.3)" : isActive ? "rgba(74, 222, 128, 0.15)" : "rgba(30, 41, 59, 0.5)",
                      border: isActive && !isInjured ? `2px solid ${C.green}` : `1px solid ${C.bgInput}`,
                      color: isInjured ? C.bgCard : isActive ? C.green : C.textMuted,
                      padding: "13px 13px",
                      cursor: isInjured ? "not-allowed" : "pointer",
                      fontFamily: FONT,
                      fontSize: F.sm,
                      textAlign: "left",
                      transition: "all 0.2s ease",
                      opacity: isInjured ? 0.4 : 1,
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>{tf.icon} {tf.label}</div>
                    <div style={{ fontSize: F.xs, opacity: 0.6 }}>{tf.desc}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Position Training (own players only) */}
        {onAssignPositionTraining && (
          <div style={{ marginTop: 22 }}>
            <div style={{ color: C.textMuted, fontSize: F.sm, marginBottom: 10, letterSpacing: 1 }}>
              LEARN NEW POSITION
            </div>
            {player.positionTraining ? (
              <div style={{
                padding: "14px 18px",
                background: "rgba(96,165,250,0.08)",
                border: "1px solid rgba(96,165,250,0.25)",
                marginBottom: 12,
              }}>
                <div style={{ fontSize: F.sm, color: C.blue, marginBottom: 5 }}>
                  🎓 Training {player.positionTraining.targetPos}
                </div>
                <div style={{ fontSize: F.micro, color: C.textMuted }}>
                  {player.positionTraining.weeksLeft} / {player.positionTraining.totalWeeks} weeks remaining
                </div>
                <div style={{ width: "100%", height: 7, background: C.bgCard, marginTop: 9, position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${((player.positionTraining.totalWeeks - player.positionTraining.weeksLeft) / player.positionTraining.totalWeeks) * 100}%`,
                    background: C.blue,
                  }} />
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: F.micro, color: C.textDim, marginBottom: 10, lineHeight: 1.5 }}>
                  Train to play in a new position without penalties. Cannot train stats while learning.
                  {player.learnedPositions && player.learnedPositions.length > 0 && (
                    <div style={{ marginTop: 7, color: C.green }}>
                      Learned: {player.learnedPositions.join(", ")}
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
                  {ALL_POSITIONS.filter(pos => pos !== player.position).map(pos => {
                    const alreadyLearned = player.learnedPositions && player.learnedPositions.includes(pos);
                    const weeks = getPositionTrainingWeeks(player.position, pos);
                    const isInjured = !!player.injury;
                    return (
                      <button
                        key={pos}
                        onClick={() => !isInjured && !alreadyLearned && onAssignPositionTraining(player.id, pos)}
                        disabled={alreadyLearned || isInjured}
                        style={{
                          background: alreadyLearned ? "rgba(74,222,128,0.1)" : isInjured ? "rgba(15,15,30,0.3)" : "rgba(30, 41, 59, 0.5)",
                          border: alreadyLearned ? "1px solid #4ade8044" : `1px solid ${C.bgInput}`,
                          color: alreadyLearned ? C.green : isInjured ? C.bgCard : C.textMuted,
                          padding: "10px 8px",
                          cursor: alreadyLearned || isInjured ? "not-allowed" : "pointer",
                          fontFamily: FONT,
                          fontSize: F.micro,
                          textAlign: "center",
                          transition: "all 0.2s ease",
                          opacity: alreadyLearned || isInjured ? 0.5 : 1,
                        }}
                      >
                        <div style={{ fontSize: F.xs, marginBottom: 3 }}>{pos}</div>
                        <div style={{ fontSize: F.micro, opacity: 0.7 }}>
                          {alreadyLearned ? "✓ Learned" : `${weeks}w`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Make Offer section (AI players only) */}
        {!onAssignTraining && tradeContext && (() => {
          const value = getPlayerValue(player);
          const relTier = getRelationshipTier(tradeContext.relationship || 0);
          const pips = Math.min(5, Math.max(1, Math.round((value / 800) * 5)));
          return (
            <div style={{
              marginTop: 4,
              padding: mob ? "18px 14px" : "22px 24px",
              background: "rgba(96,165,250,0.06)",
              border: "1px solid rgba(96,165,250,0.2)",
            }}>
              <div style={{ color: C.blue, fontSize: F.md, letterSpacing: 2, marginBottom: 16 }}>
                MAKE AN OFFER
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <ClubBadge name={tradeContext.aiClubName} color={tradeContext.aiClubColor} size={28} />
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: F.sm, color: C.text }}>{tradeContext.aiClubName}</span>
                  <span style={{ fontSize: F.micro, color: C.textDim }}>
                    {tradeContext.aiClubLeague || `Tier ${tradeContext.aiClubTier}`}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: F.micro, color: C.slate, marginBottom: 4 }}>RELATIONSHIP</div>
                  <div style={{ fontSize: F.sm, color: tradeContext.relationship >= 60 ? C.green : tradeContext.relationship >= 30 ? C.gold : C.textMuted }}>
                    {relTier} ({Math.round(tradeContext.relationship || 0)}%)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: F.micro, color: C.slate, marginBottom: 4 }}>EST. VALUE</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {[1,2,3,4,5].map(i => (
                      <span key={i} style={{
                        display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                        background: i <= pips ? C.blue : C.bgCard,
                        border: `1px solid ${C.bgInput}`,
                      }} />
                    ))}
                    <span style={{ fontSize: F.sm, color: C.blue, marginLeft: 4 }}>{value}</span>
                  </div>
                </div>
              </div>

              {tradeContext.transferWindowOpen ? (
                <>
                  <button
                    onClick={() => tradeContext.onMakeOffer(player)}
                    style={{
                      width: "100%", padding: "14px 20px", cursor: "pointer",
                      fontFamily: FONT, fontSize: F.sm,
                      background: "linear-gradient(180deg, #1e3a5f, #172554)",
                      border: `2px solid ${C.blue}`,
                      color: C.blue, letterSpacing: 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    PROPOSE TRADE
                  </button>
                  {tradeContext.transferWindowWeeksRemaining != null && (
                    <div style={{ fontSize: F.micro, color: C.slate, marginTop: 10, textAlign: "center" }}>
                      Transfer window closes in {tradeContext.transferWindowWeeksRemaining} week{tradeContext.transferWindowWeeksRemaining !== 1 ? "s" : ""}
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  width: "100%", padding: "14px 20px", textAlign: "center",
                  fontSize: F.sm, color: C.bgInput, letterSpacing: 1,
                  background: "rgba(15,15,30,0.4)", border: `1px solid ${C.bgCard}`,
                }}>
                  TRANSFER WINDOW CLOSED
                </div>
              )}
            </div>
          );
        })()}

        {/* Release player */}
        {onRelease && !player.isUnlockable && !player.isLegend && (
          <div style={{ marginTop: 23, borderTop: `1px solid ${C.bgCard}`, paddingTop: 14, textAlign: "center" }}>
            <span
              onClick={() => setConfirmRelease(true)}
              style={{
                fontSize: mob ? F.xs : F.xs, color: C.slate, cursor: "pointer",
                textDecoration: "underline", textDecorationColor: "#33415544", textUnderlineOffset: 3,
              }}
            >
              Release player
            </span>
          </div>
        )}

        {/* Release confirmation modal (separate overlay) */}
        {confirmRelease && (
          <div onClick={(e) => { e.stopPropagation(); setConfirmRelease(false); }} style={{
            position: "fixed", inset: 0, zIndex: Z.modal,
            background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONT,
          }}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: C.bg, border: `2px solid ${C.red}`,
              padding: mob ? "28px 23px" : "32px 37px", maxWidth: 437, width: "90%",
              textAlign: "center", boxShadow: "0 0 40px rgba(239,68,68,0.15)",
            }}>
              <div style={{ fontSize: F.lg, color: C.red, marginBottom: 18 }}>⚠️ RELEASE PLAYER</div>
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.textMuted, marginBottom: 9, lineHeight: 1.8 }}>
                Are you sure you want to release
              </div>
              <div style={{ fontSize: mob ? F.md : F.lg, color: C.text, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
                <span style={{ background: getPosColor(player.position), color: C.bg, padding: "3px 9px", fontSize: F.sm, fontWeight: "bold" }}>{player.position}</span>
                {player.name}
              </div>
              <div style={{ fontSize: F.xs, color: C.textDim, marginBottom: 23, lineHeight: 1.8 }}>
                This cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={() => setConfirmRelease(false)} style={{
                  padding: "14px 30px", cursor: "pointer",
                  fontFamily: FONT, fontSize: F.sm,
                  background: "rgba(30,41,59,0.5)", border: `1px solid ${C.bgInput}`, color: C.textMuted,
                }}>CANCEL</button>
                <button onClick={() => { onRelease(player.id); onClose(); }} style={{
                  padding: "14px 30px", cursor: "pointer",
                  fontFamily: FONT, fontSize: F.sm,
                  background: "rgba(239,68,68,0.15)", border: `1px solid ${C.red}`, color: C.red,
                }}>CONFIRM</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// === TACTICS PANEL ===
