import React, { useState, useMemo } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { getOverall, getAttrColor, getPosColor } from "../../utils/calc.js";
import { evaluateTrade, getRelationshipDiscount } from "../../utils/transfer.js";
import { displayName } from "../../utils/player.js";
import { useMobile } from "../../hooks/useMobile.js";
import { ClubBadge } from "../ui/ClubBadge.jsx";
import { PositionChip } from "../ui/PositionChip.jsx";

const MAX_PER_SIDE = 5;

function PlayerChip({ player, onRemove, mob, ovrCap = 20 }) {
  const ovr = getOverall(player);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: mob ? "6px 8px" : "7px 10px",
      background: "rgba(30,41,59,0.6)", border: `1px solid ${C.bgInput}`,
      fontSize: F.sm,
    }}>
      <span style={{
        background: getPosColor(player.position), color: C.bg,
        padding: "2px 5px", fontSize: F.micro, fontWeight: "bold",
      }}>{player.position}</span>
      <span style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {displayName(player.name, mob)}
      </span>
      <span style={{ color: getAttrColor(ovr, ovrCap), fontSize: F.sm, fontWeight: "bold" }}>{ovr}</span>
      <span
        onClick={(e) => { e.stopPropagation(); onRemove(player); }}
        style={{ color: C.red, cursor: "pointer", fontSize: F.xs, marginLeft: 2 }}
      >✕</span>
    </div>
  );
}

function SquadList({ players, selectedIds, onToggle, title, titleColor, mob, isUserSide, ovrCap = 20 }) {
  const sorted = useMemo(() =>
    [...players].sort((a, b) => {
      const posOrder = ["GK", "LB", "CB", "RB", "CM", "AM", "LW", "RW", "ST"];
      return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
    }),
    [players]
  );

  return (
    <div style={{
      flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
      background: "rgba(15,15,35,0.5)", border: `1px solid ${C.bgCard}`,
      maxHeight: mob ? 320 : "none", overflow: "hidden",
    }}>
      <div style={{
        padding: mob ? "10px 10px" : "12px 14px",
        borderBottom: `1px solid ${C.bgCard}`,
        fontSize: F.xs, color: titleColor, letterSpacing: 2,
      }}>
        {title} ({players.length})
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {sorted.map((p, i) => {
          const ovr = getOverall(p);
          const inTrade = selectedIds.has(p.id);
          return (
            <div
              key={p.id || `${p.name}-${i}`}
              onClick={() => onToggle(p)}
              style={{
                display: "grid",
                gridTemplateColumns: mob ? "40px 1fr 30px" : "44px 1fr 34px",
                padding: mob ? "7px 10px" : "8px 14px",
                gap: 6, alignItems: "center",
                cursor: "pointer",
                opacity: inTrade ? 0.35 : 1,
                background: inTrade ? "rgba(96,165,250,0.08)" : (i % 2 === 0 ? "transparent" : "rgba(30,41,59,0.1)"),
                borderBottom: "1px solid rgba(30,41,59,0.3)",
                transition: "opacity 0.15s ease",
              }}
            >
              <PositionChip position={p.position} mobile={mob} />
              <span style={{
                fontSize: mob ? F.xs : F.sm, color: inTrade ? C.blue : C.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {inTrade && <span style={{ marginRight: 4 }}>↔</span>}
                {displayName(p.name, mob)}
              </span>
              <span style={{ textAlign: "center", fontSize: F.sm, color: getAttrColor(ovr, ovrCap), fontWeight: "bold" }}>
                {ovr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TradeProposal({
  userSquad, aiSquad, aiClubName, aiClubColor, aiClubTier,
  relationship, teamName,
  transferWindowWeeksRemaining,
  preSelectedPlayer,
  onConfirm, onClose,
  ovrCap = 20,
}) {
  const [userOffer, setUserOffer] = useState([]);
  const [userWant, setUserWant] = useState(preSelectedPlayer ? [preSelectedPlayer] : []);
  const [mobileTab, setMobileTab] = useState("yours"); // "yours" | "theirs"
  const [success, setSuccess] = useState(false);
  const mob = useMobile();

  const userOfferIds = useMemo(() => new Set(userOffer.map(p => p.id)), [userOffer]);
  const userWantIds = useMemo(() => new Set(userWant.map(p => p.id)), [userWant]);

  // Live evaluation
  const evaluation = useMemo(() => {
    return evaluateTrade(userOffer, userWant, aiSquad, relationship);
  }, [userOffer, userWant, aiSquad, relationship]);

  const discount = getRelationshipDiscount(relationship);
  const balancePct = evaluation.effectiveAI > 0
    ? Math.min(100, Math.round((evaluation.ratio || 0) * 100))
    : 0;

  const toggleUserOffer = (player) => {
    if (userOfferIds.has(player.id)) {
      setUserOffer(prev => prev.filter(p => p.id !== player.id));
    } else if (userOffer.length < MAX_PER_SIDE) {
      setUserOffer(prev => [...prev, player]);
    }
  };

  const toggleUserWant = (player) => {
    if (userWantIds.has(player.id)) {
      setUserWant(prev => prev.filter(p => p.id !== player.id));
    } else if (userWant.length < MAX_PER_SIDE) {
      setUserWant(prev => [...prev, player]);
    }
  };

  const handleConfirm = () => {
    setSuccess(true);
    setTimeout(() => {
      onConfirm({ offered: userOffer, received: userWant });
    }, 1200);
  };

  // Success flash
  if (success) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: Z.modalHigh,
        background: "rgba(0,0,0,0.95)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: mob ? F.h2 : F.h1, color: C.green, marginBottom: 16, animation: "pulse 0.6s ease infinite" }}>
            DEAL DONE
          </div>
          <div style={{ fontSize: F.sm, color: C.textMuted }}>
            {userOffer.length} player{userOffer.length !== 1 ? "s" : ""} out, {userWant.length} player{userWant.length !== 1 ? "s" : ""} in
          </div>
        </div>
      </div>
    );
  }

  const tradeZone = (
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      padding: mob ? "14px 10px" : "18px 16px",
      background: "rgba(15,15,35,0.7)", border: `1px solid ${C.bgCard}`,
      minWidth: mob ? "auto" : 280,
    }}>
      {/* You Offer */}
      <div>
        <div style={{ fontSize: F.xs, color: C.red, letterSpacing: 2, marginBottom: 8 }}>
          YOU OFFER ({userOffer.length}/{MAX_PER_SIDE})
        </div>
        {userOffer.length === 0 ? (
          <div style={{ fontSize: F.micro, color: C.bgInput, padding: "10px 0" }}>
            Click your players to add...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {userOffer.map(p => <PlayerChip key={p.id} player={p} onRemove={() => toggleUserOffer(p)} mob={mob} ovrCap={ovrCap} />)}
          </div>
        )}
        <div style={{ fontSize: F.micro, color: C.slate, marginTop: 6 }}>
          Value: <span style={{ color: C.text }}>{evaluation.userValue}</span>
        </div>
      </div>

      {/* You Want */}
      <div>
        <div style={{ fontSize: F.xs, color: C.blue, letterSpacing: 2, marginBottom: 8 }}>
          YOU WANT ({userWant.length}/{MAX_PER_SIDE})
        </div>
        {userWant.length === 0 ? (
          <div style={{ fontSize: F.micro, color: C.bgInput, padding: "10px 0" }}>
            Click their players to add...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {userWant.map(p => <PlayerChip key={p.id} player={p} onRemove={() => toggleUserWant(p)} mob={mob} ovrCap={ovrCap} />)}
          </div>
        )}
        <div style={{ fontSize: F.micro, color: C.slate, marginTop: 6 }}>
          Asking: <span style={{ color: C.text }}>{Math.round(evaluation.effectiveAI || 0)}</span>
          {evaluation.aiValue > 0 && evaluation.discount > 0 && (
            <span style={{ color: C.green }}> (-{Math.round(evaluation.discount * 100)}%)</span>
          )}
        </div>
      </div>

      {/* Balance bar */}
      <div>
        <div style={{ fontSize: F.micro, color: C.slate, letterSpacing: 2, marginBottom: 6 }}>
          BALANCE
        </div>
        <div style={{
          height: 14, background: C.bgCard, position: "relative", overflow: "hidden",
          border: `1px solid ${C.bgInput}`,
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, bottom: 0,
            width: `${balancePct}%`,
            background: evaluation.acceptable
              ? "linear-gradient(90deg, #166534, #4ade80)"
              : balancePct >= 70
                ? "linear-gradient(90deg, #78350f, #f59e0b)"
                : "linear-gradient(90deg, #7f1d1d, #ef4444)",
            transition: "width 0.3s ease, background 0.3s ease",
          }} />
          {/* 95% threshold marker */}
          <div style={{
            position: "absolute", top: 0, bottom: 0, left: "95%",
            width: 2, background: "#4ade8066",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: F.micro, color: C.slate }}>
            Rel: {relationship >= 80 ? "Allied" : relationship >= 60 ? "Close" : relationship >= 40 ? "Friendly" : "Known"} ({Math.round(relationship)}%)
          </span>
          <span style={{ fontSize: F.micro, color: evaluation.quoteColor, fontWeight: "bold" }}>
            {balancePct}%
          </span>
        </div>
      </div>

      {/* Manager quote */}
      <div style={{
        padding: mob ? "12px 10px" : "14px 16px",
        background: "rgba(30,41,59,0.4)", border: `1px solid ${evaluation.quoteColor}33`,
        borderLeft: `3px solid ${evaluation.quoteColor}`,
      }}>
        <div style={{ fontSize: F.sm, color: evaluation.quoteColor, lineHeight: 1.7 }}>
          &ldquo;{evaluation.quote}&rdquo;
        </div>
        <div style={{ fontSize: F.micro, color: C.slate, marginTop: 6 }}>
          — {aiClubName} Manager
        </div>
      </div>

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        disabled={!evaluation.acceptable || userOffer.length === 0 || userWant.length === 0}
        style={{
          padding: mob ? "14px 16px" : "16px 24px",
          fontFamily: FONT,
          fontSize: F.sm, letterSpacing: 1,
          cursor: evaluation.acceptable && userOffer.length > 0 && userWant.length > 0 ? "pointer" : "not-allowed",
          background: evaluation.acceptable && userOffer.length > 0 && userWant.length > 0
            ? "linear-gradient(180deg, #166534, #14532d)" : "rgba(15,15,30,0.4)",
          border: evaluation.acceptable && userOffer.length > 0 && userWant.length > 0
            ? `2px solid ${C.green}` : `1px solid ${C.bgCard}`,
          color: evaluation.acceptable && userOffer.length > 0 && userWant.length > 0
            ? C.green : C.bgInput,
          transition: "all 0.2s ease",
        }}
      >
        CONFIRM DEAL
      </button>
    </div>
  );

  // Desktop: 3 columns. Mobile: trade zone top, tabbed squads bottom.
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: Z.seasonModal,
        background: "rgba(0,0,0,0.92)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: FONT,
        padding: mob ? 8 : 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 1200, maxHeight: "95vh",
          display: "flex", flexDirection: "column",
          background: C.bg, border: `1px solid ${C.bgInput}`,
          boxShadow: "0 0 60px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: mob ? "14px 12px" : "16px 20px",
          borderBottom: `1px solid ${C.bgCard}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ClubBadge name={teamName} color={C.green} size={mob ? 22 : 28} />
            <span style={{ fontSize: F.xs, color: C.textMuted }}>↔</span>
            <ClubBadge name={aiClubName} color={aiClubColor} size={mob ? 22 : 28} />
            <span style={{ fontSize: mob ? F.xs : F.sm, color: C.text, marginLeft: 4 }}>
              {mob ? "TRADE" : "TRADE PROPOSAL"}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: `1px solid ${C.bgInput}`, color: C.textDim,
            padding: "8px 14px", cursor: "pointer", fontSize: F.lg,
            fontFamily: FONT,
          }}>✕</button>
        </div>

        {/* Body */}
        {mob ? (
          /* Mobile layout */
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
            {tradeZone}

            <div style={{
              display: "flex", borderBottom: `1px solid ${C.bgCard}`,
            }}>
              {[{ key: "yours", label: "YOUR SQUAD" }, { key: "theirs", label: `${aiClubName.toUpperCase()}` }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setMobileTab(t.key)}
                  style={{
                    flex: 1, padding: "10px 8px",
                    fontFamily: FONT, fontSize: F.micro,
                    background: mobileTab === t.key ? "rgba(74,222,128,0.08)" : "transparent",
                    border: "none", borderBottom: mobileTab === t.key ? `2px solid ${C.green}` : "2px solid transparent",
                    color: mobileTab === t.key ? C.green : C.slate,
                    cursor: "pointer",
                  }}
                >{t.label}</button>
              ))}
            </div>

            {mobileTab === "yours" ? (
              <SquadList
                players={userSquad}
                selectedIds={userOfferIds}
                onToggle={toggleUserOffer}
                title="YOUR SQUAD"
                titleColor={C.green}
                mob={mob}
                isUserSide
                ovrCap={ovrCap}
              />
            ) : (
              <SquadList
                players={aiSquad}
                selectedIds={userWantIds}
                onToggle={toggleUserWant}
                title={aiClubName.toUpperCase()}
                titleColor={C.blue}
                mob={mob}
                ovrCap={ovrCap}
              />
            )}
          </div>
        ) : (
          /* Desktop layout — 3 columns */
          <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <SquadList
                players={userSquad}
                selectedIds={userOfferIds}
                onToggle={toggleUserOffer}
                title="YOUR SQUAD"
                titleColor={C.green}
                mob={mob}
                isUserSide
                ovrCap={ovrCap}
              />
            </div>

            <div style={{ width: 300, overflowY: "auto", flexShrink: 0 }}>
              {tradeZone}
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <SquadList
                players={aiSquad}
                selectedIds={userWantIds}
                onToggle={toggleUserWant}
                title={aiClubName.toUpperCase()}
                titleColor={C.blue}
                mob={mob}
                ovrCap={ovrCap}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
