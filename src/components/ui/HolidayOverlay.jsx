import React, { useState, useEffect } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

export function HolidayOverlay({ currentMatchweek, targetMatchweek, startMatchweek, onReturn }) {
  const [sunRotation, setSunRotation] = useState(0);
  const mob = useMobile();

  // Animate sun rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setSunRotation(prev => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const totalHolidayGames = targetMatchweek - startMatchweek;
  const completedHolidayGames = currentMatchweek - startMatchweek;
  const progress = totalHolidayGames > 0
    ? Math.min(100, (completedHolidayGames / totalHolidayGames) * 100)
    : 0;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: Z.fullscreen,
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
    }}>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(5deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{
        textAlign: "center",
        maxWidth: mob ? "90%" : 500,
        padding: mob ? "40px 30px" : "62px 52px",
        background: "linear-gradient(170deg, #1e293b 0%, #0f172a 60%, #1e293b 100%)",
        border: `3px solid ${C.amber}`,
        boxShadow: "0 0 40px rgba(251, 191, 36, 0.3), 0 0 80px rgba(251, 191, 36, 0.15)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background sparkles */}
        <div style={{
          position: "absolute",
          top: "10%",
          left: "20%",
          fontSize: F.h3,
          animation: "sparkle 3s ease infinite",
          animationDelay: "0s",
        }}>✨</div>
        <div style={{
          position: "absolute",
          top: "30%",
          right: "15%",
          fontSize: F.xl,
          animation: "sparkle 3s ease infinite",
          animationDelay: "1s",
        }}>✨</div>
        <div style={{
          position: "absolute",
          bottom: "20%",
          left: "15%",
          fontSize: F.xl,
          animation: "sparkle 3s ease infinite",
          animationDelay: "2s",
        }}>✨</div>

        {/* Animated sun/cocktail icon */}
        <div style={{
          fontSize: F.hero,
          marginBottom: 24,
          animation: "float 3s ease infinite",
          filter: "drop-shadow(0 0 20px rgba(251, 191, 36, 0.6))",
        }}>
          <div style={{ transform: `rotate(${sunRotation}deg)`, display: "inline-block" }}>
            ☀️
          </div>
        </div>

        {/* Title */}
        <div style={{
          fontSize: mob ? F.lg : F.xl,
          color: C.amber,
          letterSpacing: 3,
          marginBottom: 8,
          textShadow: "0 0 10px rgba(251, 191, 36, 0.8)",
        }}>
          ON HOLIDAY
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: mob ? F.xs : F.sm,
          color: C.textMuted,
          marginBottom: 24,
          letterSpacing: 1,
        }}>
          Simulating matches automatically...
        </div>

        {/* Progress info */}
        <div style={{
          background: "rgba(15, 23, 42, 0.6)",
          border: `1px solid ${C.bgInput}`,
          padding: mob ? "20px" : "26px",
          marginBottom: 24,
          borderRadius: 4,
        }}>
          <div style={{
            fontSize: mob ? F.xs : F.sm,
            color: C.blue,
            marginBottom: 12,
            letterSpacing: 1,
          }}>
            MATCHDAY {currentMatchweek} / {targetMatchweek}
          </div>

          {/* Progress bar */}
          <div style={{
            width: "100%",
            height: 8,
            background: "rgba(30, 41, 59, 0.8)",
            border: `1px solid ${C.slate}`,
            overflow: "hidden",
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
              boxShadow: "0 0 10px rgba(251, 191, 36, 0.6)",
              transition: "width 0.5s ease",
            }} />
          </div>

          <div style={{
            fontSize: mob ? F.micro : F.xs,
            color: C.textDim,
            marginTop: 10,
          }}>
            {Math.round(progress)}% complete
          </div>
        </div>

        {/* Waves decoration */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 4,
          marginBottom: 24,
        }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              fontSize: mob ? F.xl : F.h3,
              animation: "wave 2s ease infinite",
              animationDelay: `${i * 0.2}s`,
            }}>🌊</div>
          ))}
        </div>

        {/* Return button */}
        <button
          onClick={onReturn}
          style={{
            padding: mob ? "14px 30px" : "18px 40px",
            background: "linear-gradient(180deg, #dc2626, #b91c1c)",
            border: `2px solid ${C.lightRed}`,
            color: "#fecaca",
            fontFamily: FONT,
            fontSize: mob ? F.xs : F.sm,
            cursor: "pointer",
            letterSpacing: 2,
            transition: "all 0.2s ease",
            boxShadow: "0 4px 0 #7f1d1d",
          }}
          onMouseEnter={e => {
            e.target.style.transform = "translateY(2px)";
            e.target.style.boxShadow = "0 2px 0 #7f1d1d";
          }}
          onMouseLeave={e => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 0 #7f1d1d";
          }}
        >
          ✈️ RETURN FROM HOLIDAY
        </button>
      </div>
    </div>
  );
}
