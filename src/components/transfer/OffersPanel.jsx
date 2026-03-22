import React from "react";
import { F, C, FONT } from "../../data/tokens";
import { getOverall, getAttrColor, getPosColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { getPlayerValue, getTotalValue } from "../../utils/transfer.js";
import { ClubBadge } from "../ui/ClubBadge.jsx";
import { useMobile } from "../../hooks/useMobile.js";

function OfferPlayerChip({ player, mob, onClick, ovrCap = 20 }) {
  const ovr = getOverall(player);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 7px", background: "rgba(30,41,59,0.5)",
      border: `1px solid ${C.bgInput}`, fontSize: F.micro,
    }}>
      <span style={{
        background: getPosColor(player.position), color: C.bg,
        padding: "1px 3px", fontSize: F.micro, fontWeight: "bold",
      }}>{player.position}</span>
      <span onClick={onClick} style={{ color: C.text, cursor: onClick ? "pointer" : undefined }}>{displayName(player.name, mob)}</span>
      <span style={{ color: getAttrColor(ovr, ovrCap), fontWeight: "bold" }}>{ovr}</span>
    </span>
  );
}

export function OffersPanel({ offers, onAccept, onReject, onCounter, onPlayerClick, ovrCap = 20 }) {
  const mob = useMobile();
  if (!offers || offers.length === 0) {
    return (
      <div style={{
        padding: mob ? "42px 20px" : "62px 31px", textAlign: "center",
        fontFamily: FONT,
      }}>
        <div style={{ fontSize: mob ? F.sm : F.md, color: C.bgInput, marginBottom: 12 }}>
          NO INCOMING OFFERS
        </div>
        <div style={{ fontSize: F.xs, color: C.bgCard, lineHeight: 1.8 }}>
          Build relationships with clubs to receive trade proposals.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: mob ? "12px 8px" : "16px 20px", fontFamily: FONT }}>
      <div style={{ fontSize: F.xs, color: C.slate, letterSpacing: 2, marginBottom: 14 }}>
        INCOMING OFFERS ({offers.length})
      </div>

      {offers.map((offer, i) => {
        const wantVal = getTotalValue(offer.aiWants);
        const offerVal = getTotalValue(offer.aiOffers);
        return (
          <div key={i} style={{
            padding: mob ? "14px 10px" : "18px 16px",
            marginBottom: 10,
            background: "rgba(30,41,59,0.2)",
            border: `1px solid ${C.bgCard}`,
            borderLeft: `3px solid ${offer.relationship >= 60 ? C.green : "#f59e0b"}`,
          }}>
            {/* Club header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <ClubBadge name={offer.aiClubName} color={offer.aiClubColor} size={24} />
              <span style={{ fontSize: F.sm, color: C.text, flex: 1 }}>{offer.aiClubName}</span>
              <span style={{ fontSize: F.micro, color: C.slate }}>
                Expires: {offer.expiresWeeks}w
              </span>
            </div>

            {/* What they want */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: F.micro, color: C.red, letterSpacing: 1, marginBottom: 4 }}>THEY WANT</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {offer.aiWants.map((p, j) => <OfferPlayerChip key={j} player={p} mob={mob} onClick={() => onPlayerClick?.(p)} ovrCap={ovrCap} />)}
              </div>
              <div style={{ fontSize: F.micro, color: C.slate, marginTop: 3 }}>Val: {wantVal}</div>
            </div>

            {/* What they offer */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: F.micro, color: C.blue, letterSpacing: 1, marginBottom: 4 }}>THEY OFFER</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {offer.aiOffers.map((p, j) => <OfferPlayerChip key={j} player={p} mob={mob} onClick={() => onPlayerClick?.(p)} ovrCap={ovrCap} />)}
              </div>
              <div style={{ fontSize: F.micro, color: C.slate, marginTop: 3 }}>Val: {offerVal}</div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={() => onAccept(offer, i)}
                style={{
                  padding: "10px 18px", cursor: "pointer",
                  fontFamily: FONT, fontSize: F.xs,
                  background: "rgba(74,222,128,0.1)", border: `1px solid ${C.green}`, color: C.green,
                }}
              >ACCEPT</button>
              <button
                onClick={() => onCounter(offer, i)}
                style={{
                  padding: "10px 18px", cursor: "pointer",
                  fontFamily: FONT, fontSize: F.xs,
                  background: "rgba(96,165,250,0.1)", border: `1px solid ${C.blue}`, color: C.blue,
                }}
              >COUNTER</button>
              <button
                onClick={() => onReject(i)}
                style={{
                  padding: "10px 18px", cursor: "pointer",
                  fontFamily: FONT, fontSize: F.xs,
                  background: "rgba(239,68,68,0.1)", border: `1px solid ${C.red}`, color: C.red,
                }}
              >REJECT</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
