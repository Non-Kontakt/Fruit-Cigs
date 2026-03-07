import React, { useState, useEffect } from "react";
import { LEAGUE_DEFS } from "../../data/leagues.js";
import { SFX } from "../../utils/sfx.js";
import { F, C, FONT, Z } from "../../data/tokens";

export function SeasonEndReveal({ info, onDone }) {
  const [phase, setPhase] = useState(0); // 0=fade in, 1=show result
  const [confetti, setConfetti] = useState([]);
  const mob = window.innerWidth <= 768;

  const isChampion = info.position === 1;
  const isPromoted = info.type === "promoted";
  const isRelegated = info.type === "relegated";
  const isInvincible = isChampion && info.isInvincible;

  // Tier-specific confetti palettes (dynamic based on league color)
  const leagueCol = LEAGUE_DEFS[info.fromTier]?.color || C.green;
  const CONFETTI_COLORS_DEFAULT = [leagueCol, C.text, C.green, C.blue, C.gold, C.purple];
  const INVINCIBLE_COLORS = [C.gold, C.amber, "#f59e0b", "#fde68a", "#eab308", C.text, "#fef9c3", "#fffbeb"];

  useEffect(() => {
    setTimeout(() => setPhase(1), 800);
    if (isChampion || isPromoted) {
      if (isChampion) SFX.champion(); else SFX.promotion();
      // Generate confetti
      const colors = isInvincible ? INVINCIBLE_COLORS : CONFETTI_COLORS_DEFAULT;
      const count = isInvincible ? 140 : (isChampion ? 100 : 80);
      const particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * (isInvincible ? 5 : 3),
          duration: 2.5 + Math.random() * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * (isInvincible ? 7 : 5),
          wobble: Math.random() * 30 - 15,
          type: Math.random() > 0.5 ? "rect" : "circle",
        });
      }
      setConfetti(particles);
    } else if (isRelegated) {
      SFX.noGains();
    } else {
      SFX.achievement();
    }
  }, []);

  const color = isInvincible ? C.gold : isChampion ? (LEAGUE_DEFS[info.fromTier]?.color || C.green) : isPromoted ? C.green : isRelegated ? C.lightRed : C.gold;
  const emoji = isInvincible ? "👑" : isChampion ? "🏆" : isPromoted ? "📈" : isRelegated ? "📉" : "🏟️";
  const title = isInvincible ? "INVINCIBLES!" : isChampion ? "CHAMPIONS!" : isPromoted ? "PROMOTED!" : isRelegated ? "RELEGATED" : "SEASON COMPLETE";
  const ordSuffix = (n) => n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  let subtitle;
  if (isInvincible && isPromoted) {
    subtitle = `Undefeated champions of ${info.leagueName}! A perfect season. Moving up to ${info.newLeagueName}.`;
  } else if (isInvincible) {
    subtitle = `Undefeated champions of ${info.leagueName}! A perfect season.`;
  } else if (isChampion && isPromoted) {
    subtitle = `Champions of ${info.leagueName}! Moving up to ${info.newLeagueName}.`;
  } else if (isChampion && info.fromTier === 1) {
    subtitle = (info.prestigeLevel != null && info.prestigeLevel < 5)
      ? `Champions of ${info.leagueName}! A wormhole opens beyond the pyramid...`
      : `Champions of ${info.leagueName}! Top of the pyramid.`;
  } else if (isChampion) {
    subtitle = `Champions of ${info.leagueName}!`;
  } else if (isPromoted && info.miniTournamentFinish) {
    const mtLabel = info.miniTournamentFinish === "winner" ? "Won the 5v5 Mini-Tournament!"
      : info.miniTournamentFinish === "runner_up" ? "Runner-up in the 5v5 Mini-Tournament."
      : "Won the 3rd-place playoff in the 5v5 Mini-Tournament.";
    subtitle = `${mtLabel} Promoted to ${info.newLeagueName}!`;
  } else if (isPromoted) {
    subtitle = `Finished ${info.position}${ordSuffix(info.position)} in ${info.leagueName}. Promoted to ${info.newLeagueName}!`;
  } else if (isRelegated) {
    subtitle = `Finished ${info.position}${ordSuffix(info.position)} in ${info.leagueName}. Dropping to ${info.newLeagueName}.`;
  } else {
    subtitle = `Finished ${info.position}${ordSuffix(info.position)} in ${info.leagueName}. Same league next season.`;
  }

  return (
    <div onClick={() => { if (phase >= 1) onDone(); }} style={{
      position: "fixed", inset: 0, zIndex: Z.seasonModal,
      background: "rgba(0,0,0,0.95)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: FONT,
      cursor: phase >= 1 ? "pointer" : "default",
      overflow: "hidden",
    }}>
      {/* Confetti layer */}
      {confetti.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`,
          top: -20,
          width: p.type === "rect" ? p.size : p.size,
          height: p.type === "rect" ? p.size * 1.5 : p.size,
          borderRadius: p.type === "circle" ? "50%" : "1px",
          background: p.color,
          opacity: 0.9,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s infinite`,
          transform: `rotate(${p.wobble}deg)`,
          pointerEvents: "none",
        }} />
      ))}

      {/* Invincible gold shimmer overlay */}
      {isInvincible && (
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at center, rgba(250,204,21,0.15) 0%, transparent 70%)",
          animation: "invinciblePulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}

      <style>{`
        @keyframes confettiFall {
          0% { top: -5%; opacity: 1; transform: rotate(0deg) translateX(0px); }
          25% { opacity: 1; transform: rotate(90deg) translateX(15px); }
          50% { opacity: 0.8; transform: rotate(180deg) translateX(-10px); }
          75% { opacity: 0.6; transform: rotate(270deg) translateX(20px); }
          100% { top: 105%; opacity: 0; transform: rotate(360deg) translateX(-5px); }
        }
        @keyframes invinciblePulse {
          0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; }
        }
        @keyframes goldGlow {
          0%, 100% { text-shadow: 0 0 20px rgba(250,204,21,0.4), 0 0 40px rgba(250,204,21,0.2); }
          50% { text-shadow: 0 0 40px rgba(250,204,21,0.8), 0 0 80px rgba(250,204,21,0.4), 0 0 120px rgba(250,204,21,0.2); }
        }
      `}</style>

      <div style={{
        textAlign: "center", maxWidth: mob ? 340 : 450, width: "95%",
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "scale(1)" : "scale(0.8)",
        transition: "all 0.8s ease",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ fontSize: mob ? F.h1 : F.hero, marginBottom: mob ? 20 : 30 }}>{emoji}</div>
        <div style={{
          fontSize: isInvincible ? (mob ? F.h3 : F.h2) : (mob ? F.xl : F.h3), color, letterSpacing: mob ? 3 : 5, marginBottom: mob ? 16 : 23,
          textShadow: `0 0 30px ${color}66`,
          animation: isInvincible ? "goldGlow 2s ease infinite" : "none",
        }}>
          {title}
        </div>
        <div style={{
          background: isInvincible ? "linear-gradient(180deg, rgba(250,204,21,0.12), rgba(250,204,21,0.04))" : `${color}10`,
          border: isInvincible ? "2px solid rgba(250,204,21,0.5)" : `2px solid ${color}40`,
          padding: mob ? "22px 16px" : "35px 30px",
          marginBottom: mob ? 20 : 30,
        }}>
          <div style={{ fontSize: mob ? F.sm : F.md, color: C.textMuted, lineHeight: 1.8, marginBottom: mob ? 16 : 23 }}>
            {subtitle}
          </div>
          {info.type !== "stayed" && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: mob ? 8 : 14,
              fontSize: mob ? F.xs : F.sm, color: C.textDim, flexWrap: "wrap",
            }}>
              <span style={{ color: LEAGUE_DEFS[info.fromTier]?.color || C.textMuted }}>
                {info.leagueName}
              </span>
              <span style={{ color }}>→</span>
              <span style={{ color: LEAGUE_DEFS[info.toTier]?.color || C.textMuted }}>
                {info.newLeagueName}
              </span>
            </div>
          )}
        </div>
        <div style={{ fontSize: F.xs, color: C.slate }}>
          TAP TO CONTINUE
        </div>
      </div>
    </div>
  );
}

// Player Unlock Reveal screen
