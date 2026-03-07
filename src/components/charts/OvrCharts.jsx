import React, { useState, useEffect, useRef } from "react";
import { F, C, FONT } from "../../data/tokens";
import { getPosColor } from "../../utils/calc.js";

export const CHART_COLORS = [
  C.green, C.blue, C.gold, "#f472b6", "#a78bfa",
  "#fb923c", "#2dd4bf", "#fb7185", "#34d399", "#818cf8",
  C.amber, C.lightRed, "#38bdf8", C.purple, "#fcd34d"
];

export function OvrProgressChart({ ovrHistory, squad, ovrCap = 20 }) {
  const [selected, setSelected] = useState(null); // null = uninitialised
  const [showDeparted, setShowDeparted] = useState(false);
  const mob = typeof window !== "undefined" && window.innerWidth <= 768;

  // Build player lists
  const currentKeys = new Set((squad || []).map(p => `${p.name}|${p.position}`));
  const allKeys = new Set();
  (ovrHistory || []).forEach(snap => {
    Object.keys(snap.p).forEach(k => allKeys.add(k));
  });
  const departedKeys = [...allKeys].filter(k => !currentKeys.has(k));
  const currentList = [...allKeys].filter(k => currentKeys.has(k));

  // Initialise selection to current squad on first render
  useEffect(() => {
    if (selected === null && currentList.length > 0) {
      setSelected(new Set(currentList));
    }
  }, [currentList.length]); // eslint-disable-line

  const activeSelected = selected || new Set(currentList);

  // Assign stable colors by sorted key order
  const sortedAll = [...allKeys].sort();
  const colorMap = {};
  sortedAll.forEach((k, i) => { colorMap[k] = CHART_COLORS[i % CHART_COLORS.length]; });

  // Build chart data
  const chartData = (ovrHistory || []).map((snap, i) => {
    const row = { idx: i, label: `S${snap.s}W${snap.w}`, season: snap.s, week: snap.w };
    [...activeSelected].forEach(k => {
      if (snap.p[k] !== undefined) row[k] = snap.p[k];
    });
    return row;
  });

  // Find season boundaries for reference lines
  const seasonBoundaries = [];
  for (let i = 1; i < chartData.length; i++) {
    if (chartData[i].season !== chartData[i - 1].season) {
      seasonBoundaries.push({ idx: i, season: chartData[i].season });
    }
  }

  const displayName = (key) => {
    const [name, pos] = key.split("|");
    return `${name} (${pos})`;
  };
  const shortName = (key) => {
    const [name, pos] = key.split("|");
    const parts = name.split(" ");
    return parts.length > 1 ? `${parts[0][0]}. ${parts[parts.length - 1]}` : name;
  };

  const togglePlayer = (key) => {
    setSelected(prev => {
      const next = new Set(prev || currentList);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set([...currentList, ...(showDeparted ? departedKeys : [])]));
  const selectNone = () => setSelected(new Set());

  if (!ovrHistory || ovrHistory.length < 2) {
    return (
      <div style={{ padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: F.sm, color: C.gold, letterSpacing: 2, marginBottom: 14 }}>📈 SQUAD PROGRESS</div>
        <div style={{ fontSize: F.sm, color: C.slate }}>Play a few weeks to start tracking progress</div>
      </div>
    );
  }

  // Compute Y domain
  let minOvr = 20, maxOvr = 1;
  chartData.forEach(row => {
    [...activeSelected].forEach(k => {
      if (row[k] !== undefined) {
        minOvr = Math.min(minOvr, row[k]);
        maxOvr = Math.max(maxOvr, row[k]);
      }
    });
  });
  minOvr = Math.max(1, minOvr - 1);
  maxOvr = Math.min(ovrCap, maxOvr + 1);

  return (
    <div>
      <div style={{ fontSize: F.sm, color: C.gold, letterSpacing: 2, marginBottom: 9 }}>📈 SQUAD PROGRESS</div>
      <div style={{ fontSize: F.xs, color: C.textDim, marginBottom: 14 }}>Overall ratings tracked across {(ovrHistory[ovrHistory.length - 1]?.s || 1)} season{(ovrHistory[ovrHistory.length - 1]?.s || 1) !== 1 ? "s" : ""}</div>

      {/* Chart */}
      <div style={{ width: "100%", height: mob ? 253 : 322, marginBottom: 18 }}>
        <OvrChart
          data={chartData}
          playerKeys={[...activeSelected]}
          colorMap={colorMap}
          minOvr={minOvr}
          maxOvr={maxOvr}
          seasonBoundaries={seasonBoundaries}
          shortName={shortName}
          mob={mob}
        />
      </div>

      {/* Selection controls */}
      <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={selectAll} style={{
          padding: "7px 12px", fontSize: F.xs, fontFamily: FONT,
          background: "rgba(74,222,128,0.1)", border: "1px solid #4ade8044", color: C.green, cursor: "pointer",
        }}>ALL</button>
        <button onClick={selectNone} style={{
          padding: "7px 12px", fontSize: F.xs, fontFamily: FONT,
          background: "rgba(30,41,59,0.3)", border: `1px solid ${C.bgCard}`, color: C.textDim, cursor: "pointer",
        }}>NONE</button>
        {departedKeys.length > 0 && (
          <button onClick={() => setShowDeparted(!showDeparted)} style={{
            padding: "7px 12px", fontSize: F.xs, fontFamily: FONT,
            background: showDeparted ? "rgba(239,68,68,0.1)" : "rgba(30,41,59,0.3)",
            border: showDeparted ? "1px solid #ef444444" : `1px solid ${C.bgCard}`,
            color: showDeparted ? C.red : C.textDim, cursor: "pointer",
          }}>{showDeparted ? "HIDE" : "SHOW"} DEPARTED ({departedKeys.length})</button>
        )}
      </div>

      {/* Player chips — current squad */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: departedKeys.length > 0 && showDeparted ? 9 : 0 }}>
        {currentList.sort((a, b) => {
          const posOrder = ["GK","CB","LB","RB","CM","AM","LW","RW","ST"];
          return posOrder.indexOf(a.split("|")[1]) - posOrder.indexOf(b.split("|")[1]);
        }).map(k => {
          const on = activeSelected.has(k);
          const [name, pos] = k.split("|");
          return (
            <button key={k} onClick={() => togglePlayer(k)} style={{
              padding: "7px 9px", fontSize: F.xs, fontFamily: FONT,
              background: on ? `${colorMap[k]}18` : "rgba(15,15,30,0.5)",
              border: `1px solid ${on ? colorMap[k] + "66" : C.bgCard}`,
              color: on ? colorMap[k] : C.bgInput,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
              transition: "all 0.15s ease",
              opacity: on ? 1 : 0.5,
            }}>
              <span style={{ width: 7, height: 7, background: on ? colorMap[k] : C.bgInput, display: "inline-block", flexShrink: 0 }} />
              <span style={{ background: getPosColor(pos), color: C.bg, padding: "0 3px", fontSize: F.micro, fontWeight: "bold" }}>{pos}</span>
              {name.split(" ").pop()}
            </button>
          );
        })}
      </div>

      {/* Departed players */}
      {showDeparted && departedKeys.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {departedKeys.sort().map(k => {
            const on = activeSelected.has(k);
            const [name, pos] = k.split("|");
            return (
              <button key={k} onClick={() => togglePlayer(k)} style={{
                padding: "7px 9px", fontSize: F.xs, fontFamily: FONT,
                background: on ? `${colorMap[k]}18` : "rgba(15,15,30,0.5)",
                border: `1px solid ${on ? colorMap[k] + "66" : "#1e293b33"}`,
                color: on ? colorMap[k] : C.bgCard,
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
                opacity: on ? 0.8 : 0.3,
              }}>
                <span style={{ width: 7, height: 7, background: on ? colorMap[k] : C.bgCard, display: "inline-block", flexShrink: 0 }} />
                <span style={{ background: getPosColor(pos), color: C.bg, padding: "0 3px", fontSize: F.micro, fontWeight: "bold", opacity: 0.6 }}>{pos}</span>
                {name.split(" ").pop()} ✕
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// SVG-based chart component (no recharts dependency)
export function OvrChart({ data, playerKeys, colorMap, minOvr, maxOvr, seasonBoundaries, shortName, mob }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  const W = mob ? 580 : 600;
  const H = mob ? 200 : 250;
  const pad = { top: 16, right: 8, bottom: 24, left: 28 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  if (data.length < 2 || playerKeys.length === 0) {
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ fontFamily: FONT }}>
        <text x={W / 2} y={H / 2} fill={C.slate} fontSize={F.micro} textAnchor="middle">
          {playerKeys.length === 0 ? "Select players to compare" : "Not enough data yet"}
        </text>
      </svg>
    );
  }

  const xScale = (i) => pad.left + (i / (data.length - 1)) * cw;
  const yScale = (v) => pad.top + ch - ((v - minOvr) / (maxOvr - minOvr || 1)) * ch;

  // Build polyline paths
  const paths = playerKeys.map(key => {
    const points = [];
    data.forEach((row, i) => {
      if (row[key] !== undefined) {
        points.push(`${xScale(i).toFixed(1)},${yScale(row[key]).toFixed(1)}`);
      }
    });
    return { key, d: points.length > 1 ? `M${points.join("L")}` : "", color: colorMap[key] || "#666" };
  }).filter(p => p.d);

  // Y axis ticks
  const yTicks = [];
  for (let v = Math.ceil(minOvr); v <= Math.floor(maxOvr); v++) {
    yTicks.push(v);
  }

  // X axis labels: show season starts
  const xLabels = [{ idx: 0, label: `S${data[0].season}` }];
  seasonBoundaries.forEach(b => xLabels.push({ idx: b.idx, label: `S${b.season}` }));

  const handleInteraction = (clientX) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = (clientX - rect.left) / rect.width * W;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    data.forEach((_, i) => {
      const dist = Math.abs(xScale(i) - mouseX);
      if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
    });
    if (nearestDist < cw / data.length * 2) {
      const row = data[nearestIdx];
      const entries = playerKeys
        .filter(k => row[k] !== undefined)
        .map(k => ({ key: k, val: row[k], color: colorMap[k] }))
        .sort((a, b) => b.val - a.val);
      setTooltip({ idx: nearestIdx, x: xScale(nearestIdx), label: row.label, entries });
    } else {
      setTooltip(null);
    }
  };

  const handleMouseMove = (e) => handleInteraction(e.clientX);
  const handleTouchMove = (e) => { e.preventDefault(); handleInteraction(e.touches[0].clientX); };

  return (
    <svg
      ref={svgRef}
      width="100%" height="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ fontFamily: FONT, cursor: "crosshair" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTooltip(null)}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => setTooltip(null)}
    >
      {/* Grid lines */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={pad.left} y1={yScale(v)} x2={W - pad.right} y2={yScale(v)} stroke={C.bgCard} strokeWidth={0.5} />
          <text x={pad.left - 4} y={yScale(v) + 2} fill={C.slate} fontSize={F.micro} textAnchor="end">{v}</text>
        </g>
      ))}

      {/* Season boundary lines */}
      {seasonBoundaries.map((b, i) => (
        <line key={i} x1={xScale(b.idx)} y1={pad.top} x2={xScale(b.idx)} y2={H - pad.bottom} stroke={C.bgInput} strokeWidth={0.5} strokeDasharray="3,3" />
      ))}

      {/* X labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={xScale(l.idx)} y={H - pad.bottom + 12} fill={C.textDim} fontSize={F.micro} textAnchor="middle">{l.label}</text>
      ))}

      {/* Player lines */}
      {paths.map(p => (
        <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      ))}

      {/* Tooltip hover line + dots */}
      {tooltip && (
        <g>
          <line x1={tooltip.x} y1={pad.top} x2={tooltip.x} y2={H - pad.bottom} stroke={C.textDim} strokeWidth={0.5} strokeDasharray="2,2" />
          {tooltip.entries.map((e, i) => (
            <circle key={i} cx={tooltip.x} cy={yScale(e.val)} r={2.5} fill={e.color} stroke="#0a0a1a" strokeWidth={1} />
          ))}
          {/* Tooltip box */}
          {(() => {
            const shown = tooltip.entries.slice(0, 10);
            const more = tooltip.entries.length - shown.length;
            return (
              <g transform={`translate(${tooltip.x + (tooltip.x > W * 0.65 ? -90 : 8)}, ${pad.top + 4})`}>
                <rect x={0} y={0} width={82} height={8 + shown.length * 8 + (more > 0 ? 8 : 0)} rx={2} fill="#0f172aee" stroke={C.bgInput} strokeWidth={0.5} />
                <text x={4} y={7} fill={C.textMuted} fontSize={F.micro}>{tooltip.label}</text>
                {shown.map((e, i) => (
                  <g key={i} transform={`translate(4, ${13 + i * 8})`}>
                    <rect x={0} y={-3} width={4} height={4} fill={e.color} />
                    <text x={6} y={0} fill="#cbd5e1" fontSize={F.micro}>{shortName(e.key)}</text>
                    <text x={74} y={0} fill={e.color} fontSize={F.micro} textAnchor="end" fontWeight="bold">{e.val}</text>
                  </g>
                ))}
                {more > 0 && <text x={4} y={13 + shown.length * 8} fill={C.slate} fontSize={F.micro}>+{more} more</text>}
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

