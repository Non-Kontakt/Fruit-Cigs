import React from "react";
import { ATTRIBUTES } from "../../data/training.js";
import { getOverall, getOvrWeights, getAttrColor, getPosColor } from "../../utils/calc.js";
import { getNatFlag, getNatLabel, displayName } from "../../utils/player.js";
import { F, C, FONT, Z, MODAL } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

// Reuses PlayerPanel's attribute-bar visual language (bar fill, value,
// position-weight percentage) so a side-by-side compare reads as the same
// game, not a bolted-on screen.
function effectiveCapFor(player, ovrCap) {
  if (player.isLegend) return player.legendCap;
  if (player.isUnlockable && player.legendCap) return player.legendCap;
  if (player.isUnlockable) return Math.max(ovrCap, ...Object.values(player.attrs));
  return ovrCap;
}

function PlayerColumn({ player, potentialKnown, ovrCap, better, mob }) {
  const cap = effectiveCapFor(player, ovrCap);
  const overall = getOverall(player);
  const weights = getOvrWeights(player.position);
  const displayedPotential = potentialKnown ? (player.potential ?? "???") : "???";

  return (
    // A flat card background here (rather than letting the modal's own
    // diagonal gradient show through) keeps both columns reading identically
    // regardless of where they land in that gradient — on the stacked mobile
    // layout the two columns sit at different heights, so without their own
    // background they picked up visibly different shades and one player
    // looked highlighted over the other.
    <div style={{ minWidth: 0, background: C.bgCard, border: `1px solid ${C.bgInput}`, borderRadius: 6, padding: mob ? "12px 10px" : "14px 16px" }}>
      {/* Sticky name header — on mobile (stacked columns, one shared scroll
          container) this keeps whose stats you're reading visible as you
          scroll past a long attribute list into the next player's block. */}
      <div style={{
        position: "sticky", top: 0, zIndex: 2, background: C.bgCard,
        paddingBottom: 10, marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span style={{ background: getPosColor(player.position), color: C.bg, padding: "4px 10px", fontSize: F.md, fontWeight: "bold" }}>
            {player.position}
          </span>
          <span style={{ color: C.text, fontSize: F.lg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName(player.name, mob)}
          </span>
        </div>
        <div style={{ color: C.textDim, fontSize: F.xs, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <span style={{ fontSize: F.md, lineHeight: 1 }}>{getNatFlag(player.nationality)}</span>
          <span>{getNatLabel(player.nationality)} · Age {player.age}</span>
        </div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontSize: F.h3, fontWeight: "bold", color: better === true ? C.green : C.text }}>
            OVR {overall}
          </span>
          <span style={{ fontSize: F.xs, color: C.textDim }}>POT {displayedPotential}</span>
        </div>
      </div>

      {ATTRIBUTES.map(attr => {
        const val = player.attrs[attr.key];
        const weight = weights ? weights[attr.key] : null;
        const isKeyAttr = weight != null && weight >= 0.15;
        return (
          <div key={attr.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ color: attr.color, fontSize: F.sm, width: 40, textAlign: "right", flexShrink: 0 }}>{attr.label}</span>
            <div style={{ flex: 1, height: 18, background: C.bgCard, position: "relative", border: `1px solid ${C.bgInput}` }}>
              <div style={{
                height: "100%", width: `${Math.min(100, (val / cap) * 100)}%`,
                background: `linear-gradient(90deg, ${attr.color}88, ${attr.color})`,
                transition: "width 0.5s ease",
              }} />
            </div>
            <span style={{ color: getAttrColor(val, cap), fontSize: F.md, width: 28, textAlign: "right", flexShrink: 0 }}>{val}</span>
            {weight != null && (
              <span style={{
                color: isKeyAttr ? attr.color : C.textDim,
                opacity: isKeyAttr ? 1 : 0.7,
                fontSize: F.micro, width: 24, textAlign: "right", flexShrink: 0,
              }}>
                {Math.round(weight * 100)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Props:
//   yourPlayer   — { player, naturalPosition, fromXI } from findComparablePlayer(), or null
//                   if the squad has nobody at all (e.g. an empty squad edge case)
//   targetPlayer — the AI transfer target (carries clubName/clubColor/clubTier)
//   scoutedPlayers — same map PlayerPanel uses to gate the target's POT reveal
export function PlayerCompareModal({ yourPlayer, targetPlayer, ovrCap = 20, scoutedPlayers, onClose }) {
  const mob = useMobile();
  if (!targetPlayer) return null;

  const targetPotentialKnown = scoutedPlayers?.[targetPlayer.id] != null;
  const yourOverall = yourPlayer ? getOverall(yourPlayer.player) : null;
  const targetOverall = getOverall(targetPlayer);

  return (
    <div style={{ ...MODAL.backdrop, zIndex: Z.modalHigh }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          ...MODAL.box,
          textAlign: "left",
          border: `2px solid ${C.bgInput}`,
          padding: mob ? "20px 16px" : "30px 36px",
          maxWidth: 760,
          width: mob ? "94%" : "92%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 0 60px rgba(0,0,0,0.8)",
          fontFamily: FONT,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          {/* Press Start 2P has no ⚖ glyph, so it fell back to a hairline
              system-font scale that read as microscopic next to the pixel
              headline. A "VS" chip in the same pixel font stays legible at
              any size and fits the head-to-head framing of this screen. */}
          <span style={{ fontSize: mob ? F.lg : F.h3, color: C.text, letterSpacing: 1 }}>
            <span style={{ color: C.gold }}>VS</span> COMPARE
          </span>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${C.bgInput}`, color: C.textDim,
            padding: "8px 17px", cursor: "pointer", fontSize: F.xl, fontFamily: FONT,
          }}>✕</button>
        </div>

        {yourPlayer && !yourPlayer.naturalPosition && (
          <div style={{
            fontSize: F.xs, color: C.textDim, marginBottom: 18,
            background: "rgba(148,163,184,0.08)", border: `1px solid ${C.bgCard}`,
            padding: "10px 14px",
          }}>
            {yourPlayer.fromXI
              ? <>Your current {targetPlayer.position} is a converted {yourPlayer.player.position} — comparing against the actual starter.</>
              : <>No natural {targetPlayer.position} in your squad — showing your closest positional fit instead.</>}
          </div>
        )}

        {!yourPlayer && (
          <div style={{
            fontSize: F.xs, color: C.textDim, marginBottom: 18,
            background: "rgba(148,163,184,0.08)", border: `1px solid ${C.bgCard}`,
            padding: "10px 14px",
          }}>
            Your squad has no one to compare against yet.
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: mob ? "1fr" : "1fr 1fr",
          gap: mob ? 24 : 28,
        }}>
          {yourPlayer && (
            <PlayerColumn
              player={yourPlayer.player}
              potentialKnown
              ovrCap={ovrCap}
              better={yourOverall > targetOverall ? true : yourOverall < targetOverall ? false : null}
              mob={mob}
            />
          )}
          <PlayerColumn
            player={targetPlayer}
            potentialKnown={targetPotentialKnown}
            ovrCap={ovrCap}
            better={yourPlayer ? (targetOverall > yourOverall ? true : targetOverall < yourOverall ? false : null) : null}
            mob={mob}
          />
        </div>
      </div>
    </div>
  );
}
