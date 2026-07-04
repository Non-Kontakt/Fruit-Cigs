import React from "react";
import { F, C, FONT } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";
import { describeLastGain } from "../../utils/attrHistory.js";

export function Sparkline({ history, attrKey, color, width: widthProp, height: heightProp, ovrCap = 20 }) {
  const mob = useMobile();
  const width = widthProp || (mob ? 80 : 120);
  const height = heightProp || (mob ? 22 : 28);
  const data = (history || []).map(h => h[attrKey]);
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

  // Season-boundary ticks — only where two consecutive snapshots both carry a
  // stamp and the season actually changed. Legacy unstamped segments (or
  // saves with no stamped history at all) simply render with no ticks.
  const seasonTicks = [];
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1], cur = history[i];
    if (prev?.season != null && cur?.season != null && cur.season !== prev.season) {
      seasonTicks.push((i / (data.length - 1)) * width);
    }
  }

  const lastGainLabel = describeLastGain(history, attrKey);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(f => (
          <line key={f} x1={0} y1={height * (1 - f)} x2={width} y2={height * (1 - f)}
            stroke={C.bgCard} strokeWidth={0.5} />
        ))}
        {/* Season boundaries */}
        {seasonTicks.map((x, i) => (
          <line key={i} x1={x} y1={0} x2={x} y2={height} stroke={C.bgInput} strokeWidth={0.5} strokeDasharray="2,2" />
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
      <span style={{ fontSize: F.micro, color: C.slate, fontFamily: FONT, whiteSpace: "nowrap" }}>
        {lastGainLabel}
      </span>
    </div>
  );
}
