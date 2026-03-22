import React from "react";
import { F, C, FONT } from "../../data/tokens";
import { getOverall, getAttrColor, getPosColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { ClubBadge } from "../ui/ClubBadge.jsx";
import { useMobile } from "../../hooks/useMobile.js";

export function TradeHistory({ history, teamName, onPlayerClick, onTeamClick, ovrCap = 20 }) {
  const mob = useMobile();
  if (!history || history.length === 0) {
    return (
      <div style={{
        padding: mob ? "42px 20px" : "62px 31px", textAlign: "center",
        fontFamily: FONT,
      }}>
        <div style={{ fontSize: mob ? F.sm : F.md, color: C.bgInput, marginBottom: 12 }}>
          NO COMPLETED TRADES
        </div>
        <div style={{ fontSize: F.xs, color: C.bgCard }}>
          Completed deals will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: mob ? "12px 8px" : "16px 20px", fontFamily: FONT }}>
      <div style={{ fontSize: F.xs, color: C.slate, letterSpacing: 2, marginBottom: 14 }}>
        TRADE HISTORY ({history.length})
      </div>

      {[...history].reverse().map((trade, i) => (
        <div key={trade.id || i} style={{
          padding: mob ? "14px 10px" : "18px 16px",
          marginBottom: 8,
          background: "rgba(30,41,59,0.15)",
          border: `1px solid ${C.bgCard}`,
          borderLeft: `3px solid ${C.green}`,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <ClubBadge name={trade.aiClubName} color={trade.aiClubColor} size={22} />
            <span onClick={() => onTeamClick?.(trade.aiClubName)} style={{ fontSize: F.sm, color: C.text, flex: 1, cursor: "pointer" }}>{trade.aiClubName}</span>
            <span style={{ fontSize: F.micro, color: C.slate }}>
              S{trade.season} W{trade.week}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? 8 : 10 }}>
            {/* Sent */}
            <div>
              <div style={{ fontSize: F.micro, color: C.red, letterSpacing: 1, marginBottom: 6 }}>SENT</div>
              {trade.offered.map((p, j) => (
                <div key={j} style={{
                  display: "flex", alignItems: "center", gap: 4, marginBottom: 3,
                  fontSize: F.micro,
                }}>
                  <span style={{
                    background: getPosColor(p.position), color: C.bg,
                    padding: "1px 3px", fontWeight: "bold",
                  }}>{p.position}</span>
                  <span onClick={() => onPlayerClick?.(p.name, teamName)} style={{ color: C.textMuted, cursor: "pointer" }}>{displayName(p.name, mob)}</span>
                  <span style={{ color: getAttrColor(getOverall(p), ovrCap) }}>{getOverall(p)}</span>
                </div>
              ))}
            </div>
            {/* Received */}
            <div>
              <div style={{ fontSize: F.micro, color: C.green, letterSpacing: 1, marginBottom: 6 }}>RECEIVED</div>
              {trade.received.map((p, j) => (
                <div key={j} style={{
                  display: "flex", alignItems: "center", gap: 4, marginBottom: 3,
                  fontSize: F.micro,
                }}>
                  <span style={{
                    background: getPosColor(p.position), color: C.bg,
                    padding: "1px 3px", fontWeight: "bold",
                  }}>{p.position}</span>
                  <span onClick={() => onPlayerClick?.(p.name, trade.aiClubName)} style={{ color: C.text, cursor: "pointer" }}>{displayName(p.name, mob)}</span>
                  <span style={{ color: getAttrColor(getOverall(p), ovrCap) }}>{getOverall(p)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
