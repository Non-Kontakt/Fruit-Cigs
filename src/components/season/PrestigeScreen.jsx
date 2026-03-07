import React, { useState, useEffect } from "react";
import { F, C, Z } from "../../data/tokens";
import { getOvrCap } from "../../utils/player.js";

export function PrestigeScreen({ prestigeLevel, newPrestigeLevel, onDone }) {
  const [phase, setPhase] = useState(0); // 0=black, 1=wormhole, 2=text, 3=button
  const mob = window.innerWidth <= 768;
  const oldCap = getOvrCap(prestigeLevel);
  const newCap = getOvrCap(newPrestigeLevel);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1600);
    const t3 = setTimeout(() => setPhase(3), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Wormhole particle ring
  const particles = [];
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * 360;
    const radius = 80 + Math.random() * 60;
    const size = 2 + Math.random() * 4;
    const delay = Math.random() * 3;
    const duration = 2 + Math.random() * 2;
    const hue = 260 + Math.random() * 60; // purple-blue range
    particles.push({ angle, radius, size, delay, duration, hue });
  }

  const keyframes = `
    @keyframes wormholeSpin {
      0% { transform: rotate(0deg) scale(0.3); opacity: 0; }
      30% { opacity: 1; }
      100% { transform: rotate(720deg) scale(1); opacity: 1; }
    }
    @keyframes wormholePulse {
      0%, 100% { box-shadow: 0 0 60px 20px rgba(139,92,246,0.3), 0 0 120px 60px rgba(139,92,246,0.1); }
      50% { box-shadow: 0 0 80px 30px rgba(139,92,246,0.5), 0 0 160px 80px rgba(139,92,246,0.2); }
    }
    @keyframes particleOrbit {
      0% { opacity: 0; transform: rotate(var(--start-angle)) translateX(var(--radius)) scale(0); }
      20% { opacity: 1; transform: rotate(var(--start-angle)) translateX(var(--radius)) scale(1); }
      100% { opacity: 0; transform: rotate(calc(var(--start-angle) + 360deg)) translateX(calc(var(--radius) * 0.2)) scale(0.3); }
    }
    @keyframes textGlow {
      0%, 100% { text-shadow: 0 0 20px rgba(192,132,252,0.8), 0 0 40px rgba(139,92,246,0.4); }
      50% { text-shadow: 0 0 30px rgba(192,132,252,1), 0 0 60px rgba(139,92,246,0.6), 0 0 80px rgba(167,139,250,0.3); }
    }
    @keyframes fadeSlideUp {
      0% { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes bgVortex {
      0% { background-position: 50% 50%; background-size: 100% 100%; }
      50% { background-position: 50% 50%; background-size: 200% 200%; }
      100% { background-position: 50% 50%; background-size: 100% 100%; }
    }
  `;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: Z.fullscreen,
      background: phase >= 1
        ? "radial-gradient(ellipse at center, #1a0533 0%, #0d0d1a 40%, #000000 100%)"
        : "#000",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      transition: "background 1.5s ease",
      overflow: "hidden",
    }}>
      <style>{keyframes}</style>

      {/* Wormhole ring */}
      {phase >= 1 && (
        <div style={{
          position: "absolute",
          width: mob ? 250 : 360,
          height: mob ? 250 : 360,
          borderRadius: "50%",
          animation: "wormholeSpin 3s ease-out forwards, wormholePulse 2s ease-in-out infinite 2s",
          background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          border: "2px solid rgba(139,92,246,0.3)",
        }}>
          {particles.map((p, i) => (
            <div key={i} style={{
              position: "absolute",
              top: "50%", left: "50%",
              width: p.size, height: p.size,
              borderRadius: "50%",
              background: `hsl(${p.hue}, 70%, 65%)`,
              "--start-angle": `${p.angle}deg`,
              "--radius": `${p.radius}px`,
              animation: `particleOrbit ${p.duration}s ease-in-out ${p.delay}s infinite`,
              transformOrigin: "0 0",
            }} />
          ))}
          {/* Center glow */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 40, height: 40, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(192,132,252,0.8) 0%, rgba(139,92,246,0.3) 50%, transparent 100%)",
            boxShadow: "0 0 40px 15px rgba(139,92,246,0.4)",
          }} />
        </div>
      )}

      {/* Text content */}
      {phase >= 2 && (
        <div style={{
          position: "relative", zIndex: 2,
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: mob ? 12 : 20,
          animation: "fadeSlideUp 1s ease-out forwards",
        }}>
          <div style={{
            fontSize: mob ? F.hero : F.hero * 1.3,
            fontWeight: 900,
            color: C.purple,
            letterSpacing: 6,
            animation: "textGlow 2s ease-in-out infinite",
            fontFamily: "monospace",
          }}>
            PRESTIGE {newPrestigeLevel}
          </div>

          <div style={{
            fontSize: mob ? F.md : F.lg,
            color: C.textMuted,
            textAlign: "center",
            maxWidth: mob ? 280 : 420,
            lineHeight: 1.6,
            animation: "fadeSlideUp 1s ease-out 0.3s both",
          }}>
            You've conquered every league in this reality.
            <br />A wormhole tears open... pulling you through to a harder dimension.
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            fontSize: mob ? F.lg : F.xl,
            color: C.text,
            animation: "fadeSlideUp 1s ease-out 0.6s both",
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 8,
            padding: "10px 20px",
          }}>
            <span style={{ color: C.textMuted }}>OVR Ceiling</span>
            <span style={{ color: "#a78bfa", fontWeight: 700 }}>{oldCap}</span>
            <span style={{ color: C.textDim }}>→</span>
            <span style={{ color: C.purple, fontWeight: 900, fontSize: mob ? F.xl : F.h3 }}>{newCap}</span>
          </div>
        </div>
      )}

      {/* Enter button */}
      {phase >= 3 && (
        <button
          onClick={onDone}
          style={{
            position: "relative", zIndex: 2,
            marginTop: mob ? 24 : 36,
            padding: mob ? "12px 28px" : "14px 36px",
            fontSize: mob ? F.md : F.lg,
            fontWeight: 700,
            fontFamily: "monospace",
            color: "#0f0f23",
            background: "linear-gradient(135deg, #a78bfa, #c084fc, #8b5cf6)",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            letterSpacing: 2,
            animation: "fadeSlideUp 0.8s ease-out forwards",
            boxShadow: "0 0 20px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.5)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.target.style.transform = "scale(1.05)"; e.target.style.boxShadow = "0 0 30px rgba(139,92,246,0.6), 0 6px 16px rgba(0,0,0,0.5)"; }}
          onMouseLeave={e => { e.target.style.transform = "scale(1)"; e.target.style.boxShadow = "0 0 20px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.5)"; }}
        >
          ENTER THE WORMHOLE
        </button>
      )}
    </div>
  );
}
