import { useState, useEffect } from "react";

import { C as TC, FONT, EMOJI } from "../../data/tokens";

const C = { ...TC };
const F = { xl: "clamp(12px,3vw,17px)", lg: "clamp(9px,2.5vw,13px)", md: "clamp(7px,2vw,10px)", sm: "clamp(6px,1.5vw,8px)", xs: "clamp(5px,1.2vw,7px)" };

function StatPill({ label, value }) {
  return (
    <div style={{
      border: "1px solid rgba(248,113,113,0.2)", padding: "12px 16px",
      background: "rgba(248,113,113,0.05)", borderRadius: 4, textAlign: "center",
    }}>
      <div style={{ fontSize: F.xs, color: C.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: F.lg, color: C.red }}>{value}</div>
    </div>
  );
}

export function SackingScreen({ teamName, seasonNumber, leagueTier, totalMatches, totalGoals, clubHistory, onViewCareer, onReturnToMenu }) {
  const [visible, setVisible] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 100);
    const t2 = setTimeout(() => setShowStats(true), 1400);
    const t3 = setTimeout(() => setShowButtons(true), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Music is managed by App.jsx for the full sacking→museum flow

  const tierLabel = leagueTier === 1 ? "Top Flight" : leagueTier <= 3 ? `Tier ${leagueTier}` : leagueTier <= 7 ? `Tier ${leagueTier}` : `Tier ${leagueTier}`;
  const seasons = (seasonNumber || 1) - 1;

  return (
    <div style={{
      minHeight: "100vh", background: "#06060f",
      fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes redPulse { 0%,100%{text-shadow:0 0 8px rgba(248,113,113,0.4)} 50%{text-shadow:0 0 24px rgba(248,113,113,0.8)} }
      `}</style>

      <div style={{
        textAlign: "center", maxWidth: 440, width: "90%",
        opacity: visible ? 1 : 0, transition: "opacity 0.8s ease",
      }}>
        {/* Icon */}
        <div style={{ ...EMOJI, fontSize: "3em", marginBottom: 20, animation: visible ? "fadeIn 0.6s ease" : "none" }}>
          📋
        </div>

        {/* Headline */}
        <div style={{
          fontSize: F.xl, color: C.red, letterSpacing: 2, marginBottom: 10,
          animation: visible ? "redPulse 3s ease infinite" : "none",
          lineHeight: 1.4,
        }}>
          YOU'VE BEEN SACKED
        </div>
        <div style={{ fontSize: F.md, color: C.textMuted, marginBottom: 32, lineHeight: 1.8 }}>
          {teamName} have terminated<br />your contract.
        </div>

        {/* Stats */}
        {showStats && (
          <div style={{
            animation: "fadeIn 0.5s ease",
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 10, marginBottom: 28,
          }}>
            <StatPill label="SEASONS" value={seasons > 0 ? seasons : "<1"} />
            <StatPill label="FINAL TIER" value={`T${leagueTier}`} />
            <StatPill label="MATCHES" value={totalMatches || 0} />
            <StatPill label="GOALS" value={totalGoals || 0} />
          </div>
        )}

        {/* Club history highlight */}
        {showStats && clubHistory && clubHistory.length > 0 && (
          <div style={{
            animation: "fadeIn 0.5s ease 0.2s both",
            border: "1px solid rgba(248,113,113,0.15)",
            background: "rgba(248,113,113,0.04)",
            padding: "12px 16px", marginBottom: 28,
            textAlign: "left",
          }}>
            <div style={{ fontSize: F.xs, color: C.slate, marginBottom: 10 }}>CAREER HIGHLIGHTS</div>
            {clubHistory.slice(-4).map((entry, i) => (
              <div key={i} style={{ fontSize: F.xs, color: C.textMuted, marginBottom: 5, lineHeight: 1.8 }}>
                S{entry.season}: {entry.leagueName || `Tier ${entry.tier}`} · {entry.position ? `${entry.position}${entry.position === 1 ? "st" : entry.position === 2 ? "nd" : entry.position === 3 ? "rd" : "th"}` : "—"}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        {showButtons && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            {onViewCareer && (
              <button
                onClick={onViewCareer}
                style={{
                  width: "100%", padding: "14px", marginBottom: 10,
                  background: "rgba(248,113,113,0.1)",
                  border: `2px solid ${C.red}`,
                  color: C.red, fontFamily: FONT, fontSize: F.md,
                  cursor: "pointer", letterSpacing: 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.18)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
              >VIEW CAREER</button>
            )}
            <button
              onClick={onReturnToMenu}
              style={{
                width: "100%", padding: "12px",
                background: "none", border: "1px solid rgba(30,41,59,0.8)",
                color: C.slate, fontFamily: FONT, fontSize: F.sm,
                cursor: "pointer", letterSpacing: 1,
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.textMuted}
              onMouseLeave={e => e.currentTarget.style.color = C.slate}
            >RETURN TO MENU</button>
          </div>
        )}
      </div>
    </div>
  );
}
