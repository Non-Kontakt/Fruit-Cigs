import React from "react";
import { F, C, FONT } from "../../data/tokens";

export function Sparkline({ data, color, width: widthProp, height: heightProp, ovrCap = 20 }) {
  const mob = window.innerWidth <= 768;
  const width = widthProp || (mob ? 80 : 120);
  const height = heightProp || (mob ? 22 : 28);
  if (data.length < 2) return null;
  const min = Math.max(0, Math.min(...data) - 1);
  const max = Math.min(ovrCap, Math.max(...data) + 1);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const diff = lastVal - firstVal;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={0} y1={height * (1 - f)} x2={width} y2={height * (1 - f)}
            stroke={C.bgCard} strokeWidth={0.5} />
        ))}
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 3px ${color}66)` }}
        />
        {/* End dot */}
        {data.length > 1 && (
          <circle
            cx={width}
            cy={height - ((lastVal - min) / range) * height}
            r={2.5}
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        )}
      </svg>
      {diff !== 0 && (
        <span style={{
          fontSize: F.xs,
          color: diff > 0 ? C.green : C.red,
          fontFamily: FONT,
        }}>
          {diff > 0 ? `+${diff}` : diff}
        </span>
      )}
    </div>
  );
}
