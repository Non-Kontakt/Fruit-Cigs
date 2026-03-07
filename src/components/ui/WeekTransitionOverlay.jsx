import React from "react";
import { C, FONT, Z } from "../../data/tokens";

export function WeekTransitionOverlay() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: Z.transition,
      background: "rgba(8, 8, 20, 0.94)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
    }}>
      <style>{`
        @keyframes wto-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%      { transform: scale(1.35); opacity: 1; }
        }
        @keyframes wto-shimmer {
          0%   { background-position: -100% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes wto-ring {
          0%   { transform: scale(0.8); opacity: 0.5; }
          50%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(0.8); opacity: 0; }
        }
      `}</style>

      <div style={{ position: "relative", width: 80, height: 80 }}>
        {/* Expanding ring */}
        <div style={{
          position: "absolute", inset: 8,
          borderRadius: "50%",
          border: `2px solid ${C.blue || "#60a5fa"}`,
          animation: "wto-ring 2s ease-out infinite",
        }} />

        {/* Core dot */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 24, height: 24,
          marginTop: -12, marginLeft: -12,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 35%, #93c5fd, ${C.blue || "#60a5fa"} 60%, #3b82f6)`,
          boxShadow: `0 0 24px 6px rgba(96,165,250,0.35), 0 0 10px 2px rgba(96,165,250,0.5)`,
          animation: "wto-pulse 2s ease-in-out infinite",
        }} />

        {/* Shimmer streak across the dot */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 24, height: 24,
          marginTop: -12, marginLeft: -12,
          borderRadius: "50%",
          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "wto-shimmer 2s ease-in-out infinite",
          mixBlendMode: "overlay",
        }} />
      </div>
    </div>
  );
}
