import React, { useState, useMemo, useRef, useEffect } from "react";
import { F, C, FONT, Z } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";
import { ATTRIBUTES } from "../../data/training.js";
import { LEAGUE_DEFS } from "../../data/leagues.js";
import { POSITION_TYPES } from "../../data/positions.js";
import { getOverall, getAttrColor } from "../../utils/calc.js";
import { getNatFlag, getNatLabel, displayName } from "../../utils/player.js";
import { ClubBadge } from "../ui/ClubBadge.jsx";
import { PositionChip } from "../ui/PositionChip.jsx";

const POSITION_ORDER = ["GK", "LB", "CB", "RB", "CM", "AM", "LW", "RW", "ST"];

const FILTER_ROWS = [
  { key: "age", label: "AGE", color: C.textMuted, range: [16, 40] },
  { key: "ovr", label: "OVR", color: C.text, range: [1, 20] },
  ...ATTRIBUTES.map(a => ({ key: a.key, label: a.label, color: a.color, range: [1, 20] })),
];

const POS_FILTERS = [
  { value: "ALL", label: "All Pos" },
  { value: "GK",  label: "GK" },
  { value: "DEF", label: "DEF" },
  { value: "MID", label: "MID" },
  { value: "FWD", label: "FWD" },
];

const STAT_COLS = [
  { key: "goals",   label: "G",    color: C.green },
  { key: "assists", label: "A",    color: "#38bdf8" },
  { key: "yellows", label: "YC",   color: C.gold },
  { key: "reds",    label: "RC",   color: C.red },
  { key: "apps",    label: "APP",  color: C.blue },
  { key: "motm",    label: "MOTM", color: "#f59e0b" },
  { key: "avg",     label: "AVG",  color: C.purple },
];

const sel = {
  background: "#0f172a", border: `1px solid ${C.bgInput}`, color: C.textMuted,
  fontSize: F.micro, fontFamily: FONT,
  padding: "7px 8px", cursor: "pointer", outline: "none",
};

function GameDropdown({ value, options, onChange, maxHeight }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activeLabel = options.find(o => o.value === value)?.label || value;

  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
        style={{
          ...sel,
          color: open ? C.green : C.textMuted,
          border: open ? "1px solid #4ade8055" : `1px solid ${C.bgInput}`,
          background: open ? "rgba(74,222,128,0.06)" : "#0f172a",
          display: "flex", alignItems: "center", gap: 6,
          whiteSpace: "nowrap",
        }}
      >
        {activeLabel} <span style={{ fontSize: F.micro, opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", left: 0, top: "100%", marginTop: 4,
          background: C.bg, border: `1px solid ${C.bgInput}`,
          zIndex: Z.dropdown, minWidth: "100%",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          maxHeight: maxHeight || 320, overflowY: "auto",
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                background: o.value === value ? "rgba(74,222,128,0.1)" : "transparent",
                border: "none", borderBottom: `1px solid ${C.bgCard}`,
                color: o.value === value ? C.green : C.text,
                fontSize: F.sm, textAlign: "left",
                cursor: "pointer", fontFamily: FONT,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (o.value !== value) e.target.style.background = "rgba(74,222,128,0.05)"; }}
              onMouseLeave={e => { if (o.value !== value) e.target.style.background = "transparent"; }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlayerSearch({
  allClubs, squad, teamName, leagueTier, visibleTiers,
  league, leagueResults, playerSeasonStats, playerRatingTracker,
  onPlayerClick, scoutedPlayers, ovrCap = 20,
}) {
  const [view,       setView]       = useState("ATTRS"); // "ATTRS" | "STATS"
  const [sortCol,    setSortCol]    = useState(null);    // null = default (OVR desc)
  const [sortDir,    setSortDir]    = useState("desc");
  const [filterPos,  setFilterPos]  = useState("ALL");
  const [filterTier, setFilterTier] = useState("ALL");
  const [filterNat,  setFilterNat]  = useState("ALL");
  const [page,       setPage]       = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [advFilters,  setAdvFilters]  = useState({});
  const [draft,       setDraft]       = useState({});
  const PAGE_SIZE = 25;

  const activeFilterCount = Object.entries(advFilters).filter(([k, v]) => {
    if (k === "nat") return v && v !== "ALL";
    if (k === "positions") return Array.isArray(v) && v.length > 0;
    return v !== "" && v != null;
  }).length;
  const mob = useMobile();

  // --- Sort header helpers ---
  function handleSort(col) {
    setPage(0);
    if (sortCol !== col) {
      setSortCol(col);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortCol(null); // back to default (OVR desc)
      setSortDir("desc");
    }
  }
  const indicator = (col) => sortCol === col ? (sortDir === "asc" ? " ↑" : " ↓") : "";
  const hStyle = (col, color) => ({
    cursor: "pointer", userSelect: "none",
    color: sortCol === col ? C.green : (color || C.bgInput),
    fontFamily: FONT, fontSize: F.micro,
    textAlign: "center",
  });

  // --- All players from allClubs + user squad ---
  const allPlayers = useMemo(() => {
    const list = [];
    for (const club of allClubs) {
      if (!club.squad?.length) continue;
      for (const p of club.squad) {
        if (!p.attrs) continue;
        list.push({ ...p, clubName: club.name, clubColor: club.color, clubTier: club.tier, ovr: getOverall(p) });
      }
    }
    if (squad?.length) {
      for (const p of squad) {
        if (!p.attrs) continue;
        list.push({ ...p, clubName: teamName, clubColor: C.green, clubTier: leagueTier, isOwnPlayer: true, ovr: getOverall(p) });
      }
    }
    return list;
  }, [allClubs, squad, teamName, leagueTier]);

  // --- Stats map: `playerName|clubName` → { goals, assists, yellows, reds, apps, motm, ratings[] } ---
  const statsMap = useMemo(() => {
    const map = {};
    const add = (key, field, val = 1) => {
      if (!map[key]) map[key] = { goals: 0, assists: 0, yellows: 0, reds: 0, apps: 0, motm: 0, ratings: [] };
      map[key][field] = (map[key][field] || 0) + val;
    };
    // AI players in current league from leagueResults
    if (leagueResults && league) {
      const teamByIdx = {};
      (league.teams || []).forEach((t, i) => { if (!t.isPlayer) teamByIdx[i] = t.name; });
      Object.values(leagueResults).forEach(mwMatches => {
        (mwMatches || []).forEach(match => {
          (match.goalScorers || []).forEach(g => {
            const cn = teamByIdx[g.side === "home" ? match.home : match.away];
            if (!cn) return;
            add(`${g.name}|${cn}`, "goals");
            if (g.assister) add(`${g.assister}|${cn}`, "assists");
          });
          (match.cardRecipients || []).forEach(c => {
            const cn = c.teamIdx != null ? teamByIdx[c.teamIdx] : null;
            if (!cn) return;
            add(`${c.name}|${cn}`, c.type === "red" ? "reds" : "yellows");
          });
          if (match.motm?.name) {
            const cn = teamByIdx[match.motm.side === "home" ? match.home : match.away];
            if (cn) add(`${match.motm.name}|${cn}`, "motm");
          }
        });
      });
    }
    // User's squad from playerSeasonStats + playerRatingTracker
    if (playerSeasonStats) {
      Object.entries(playerSeasonStats).forEach(([name, s]) => {
        const key = `${name}|${teamName}`;
        const _p = squad?.find(pl => pl.name === name);
        const ratings = (playerRatingTracker || {})[_p?.id] || [];
        map[key] = {
          goals:   s.goals   || 0,
          assists: s.assists  || 0,
          yellows: s.yellows  || 0,
          reds:    s.reds     || 0,
          apps:    s.apps     || 0,
          motm:    s.motm     || 0,
          ratings,
        };
      });
    }
    return map;
  }, [leagueResults, league, playerSeasonStats, playerRatingTracker, teamName]);

  // --- Tier filter options ---
  const tierOptions = useMemo(() => [
    { value: "ALL", label: "All Leagues" },
    ...visibleTiers.map(t => ({ value: String(t), label: LEAGUE_DEFS[t]?.shortName ?? `T${t}` })),
  ], [visibleTiers]);

  // --- Nationality filter options (only nats present in the pool) ---
  const natOptions = useMemo(() => {
    const codes = new Set();
    for (const p of allPlayers) {
      if (p.nationality) codes.add(p.nationality);
    }
    const sorted = [...codes].sort((a, b) => getNatLabel(a).localeCompare(getNatLabel(b)));
    return [
      { value: "ALL", label: "All Nations" },
      ...sorted.map(c => ({ value: c, label: `${getNatFlag(c)} ${getNatLabel(c)}` })),
    ];
  }, [allPlayers]);

  // --- Filtered + sorted list ---
  const getStatVal = (p, key) => {
    const s = statsMap[`${p.name}|${p.clubName}`] || {};
    if (key === "avg") {
      const rs = s.ratings || [];
      return rs.length > 0 ? rs.reduce((a, r) => a + r, 0) / rs.length : -1;
    }
    return s[key] || 0;
  };

  const filtered = useMemo(() => {
    let list = allPlayers;
    if (filterPos !== "ALL") list = list.filter(p => POSITION_TYPES[p.position] === filterPos);
    if (filterTier !== "ALL") list = list.filter(p => p.clubTier === parseInt(filterTier));
    if (filterNat !== "ALL") list = list.filter(p => p.nationality === filterNat);

    // Advanced filters (positions)
    if (advFilters.positions?.length > 0 && filterPos === "ALL") {
      list = list.filter(p => advFilters.positions.includes(p.position));
    }

    // Advanced filters (nationality)
    if (advFilters.nat && advFilters.nat !== "ALL" && filterNat === "ALL") {
      list = list.filter(p => p.nationality === advFilters.nat);
    }

    // Advanced filters (ranges)
    for (const row of FILTER_ROWS) {
      const min = advFilters[`${row.key}_min`];
      const max = advFilters[`${row.key}_max`];
      if (min !== "" && min != null) {
        const v = Number(min);
        if (!isNaN(v)) {
          if (row.key === "age") list = list.filter(p => (p.age || 0) >= v);
          else if (row.key === "ovr") list = list.filter(p => p.ovr >= v);
          else list = list.filter(p => (p.attrs?.[row.key] || 0) >= v);
        }
      }
      if (max !== "" && max != null) {
        const v = Number(max);
        if (!isNaN(v)) {
          if (row.key === "age") list = list.filter(p => (p.age || 0) <= v);
          else if (row.key === "ovr") list = list.filter(p => p.ovr <= v);
          else list = list.filter(p => (p.attrs?.[row.key] || 0) <= v);
        }
      }
    }

    return [...list].sort((a, b) => {
      const col = sortCol;
      if (!col) return b.ovr - a.ovr; // default

      const dir = sortDir === "asc" ? 1 : -1;
      if (col === "pos")  return dir * ((POSITION_ORDER.indexOf(a.position) ?? 99) - (POSITION_ORDER.indexOf(b.position) ?? 99));
      if (col === "name") return dir * a.name.localeCompare(b.name);
      if (col === "club") return dir * (a.clubName || "").localeCompare(b.clubName || "");
      if (col === "age")  return dir * ((a.age || 0) - (b.age || 0));
      if (col === "ovr")  return dir * (a.ovr - b.ovr);
      if (STAT_COLS.some(s => s.key === col)) return dir * (getStatVal(a, col) - getStatVal(b, col));
      // attribute
      return dir * ((a.attrs?.[col] || 0) - (b.attrs?.[col] || 0));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlayers, filterPos, filterTier, filterNat, sortCol, sortDir, statsMap, advFilters]);

  // --- Grid ---
  const attrsGrid = "54px 1fr 30px 36px 42px repeat(7, 38px) 182px";
  const statsGrid  = "54px 1fr 30px 36px 42px 38px 38px 36px 36px 40px 42px 42px 182px";
  const mobileGrid = "44px 1fr 26px 36px 104px";
  const grid = mob ? mobileGrid : (view === "ATTRS" ? attrsGrid : statsGrid);

  return (
    <div style={{ padding: mob ? "10px 6px" : "14px 16px" }}>

      {/* Controls */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
        marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.bgCard}`,
      }}>
        {/* View toggle */}
        {["ATTRS", "STATS"].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              ...sel,
              padding: "7px 13px",
              color: view === v ? C.green : C.textDim,
              border: view === v ? "1px solid #4ade8055" : `1px solid ${C.bgInput}`,
              background: view === v ? "rgba(74,222,128,0.08)" : "#0f172a",
            }}
          >
            {v}
          </button>
        ))}

        {/* Separator */}
        <span style={{ color: C.bgCard, fontSize: F.md }}>|</span>

        {/* Position filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: F.micro, color: C.slate, fontFamily: FONT }}>POS</span>
          <GameDropdown value={filterPos} options={POS_FILTERS} onChange={v => { setFilterPos(v); setPage(0); }} />
        </div>

        {/* League filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: F.micro, color: C.slate, fontFamily: FONT }}>LEAGUE</span>
          <GameDropdown value={filterTier} options={tierOptions} onChange={v => { setFilterTier(v); setPage(0); }} />
        </div>

        {/* Nationality filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: F.micro, color: C.slate, fontFamily: FONT }}>NAT</span>
          <GameDropdown value={filterNat} options={natOptions} onChange={v => { setFilterNat(v); setPage(0); }} maxHeight={360} />
        </div>

        {/* Advanced filters button */}
        <button
          onClick={() => { setDraft({ ...advFilters }); setShowFilters(true); }}
          style={{
            ...sel,
            padding: "7px 13px",
            color: activeFilterCount > 0 ? C.green : C.textDim,
            border: activeFilterCount > 0 ? "1px solid #4ade8055" : `1px solid ${C.bgInput}`,
            background: activeFilterCount > 0 ? "rgba(74,222,128,0.08)" : "#0f172a",
            position: "relative",
          }}
        >
          FILTERS
          {activeFilterCount > 0 && (
            <span style={{
              position: "absolute", top: -6, right: -6,
              background: C.green, color: "#0a0a1a",
              fontSize: 8, fontFamily: FONT,
              width: 16, height: 16, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold",
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        <span style={{ fontSize: F.micro, color: C.bgInput, fontFamily: FONT, marginLeft: "auto" }}>
          {filtered.length > PAGE_SIZE
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} OF ${filtered.length}`
            : `${filtered.length} PLAYERS`}
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid", gridTemplateColumns: grid,
        padding: "6px 8px", gap: mob ? 4 : 6,
        borderBottom: `1px solid ${C.bgCard}`,
      }}>
        <span onClick={() => handleSort("pos")}  style={hStyle("pos")}>POS</span>
        <span onClick={() => handleSort("name")} style={{ ...hStyle("name"), textAlign: "left" }}>NAME</span>
        <span style={{ textAlign: "center", fontSize: F.micro, color: C.bgInput, fontFamily: FONT }}>NAT</span>
        {!mob && <span onClick={() => handleSort("age")} style={hStyle("age")}>AGE{indicator("age")}</span>}
        <span onClick={() => handleSort("ovr")}  style={hStyle("ovr")}> OVR{indicator("ovr")}</span>

        {!mob && view === "ATTRS" && ATTRIBUTES.map(a => (
          <span key={a.key} onClick={() => handleSort(a.key)} style={hStyle(a.key, a.color)}>
            {a.label}{indicator(a.key)}
          </span>
        ))}

        {!mob && view === "STATS" && STAT_COLS.map(s => (
          <span key={s.key} onClick={() => handleSort(s.key)} style={hStyle(s.key, s.color)}>
            {s.label}{indicator(s.key)}
          </span>
        ))}

        <span onClick={() => handleSort("club")} style={{ ...hStyle("club"), textAlign: "left" }}>
          CLUB{indicator("club")}
        </span>
      </div>

      {/* Rows (paginated) */}
      {filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((p, i) => {
        const flag     = p.nationality ? getNatFlag(p.nationality) : "";
        const league   = LEAGUE_DEFS[p.clubTier]?.shortName ?? `T${p.clubTier}`;
        const stats    = statsMap[`${p.name}|${p.clubName}`] || {};
        const avgRatings = stats.ratings || [];
        const avg      = avgRatings.length > 0
          ? (avgRatings.reduce((s, r) => s + r, 0) / avgRatings.length).toFixed(1)
          : "—";
        const avgColor = avg !== "—"
          ? (parseFloat(avg) >= 8 ? C.green : parseFloat(avg) >= 7 ? C.gold : parseFloat(avg) >= 6 ? C.textMuted : C.red)
          : C.bgInput;

        return (
          <div
            key={`${p.clubName}-${p.name}-${i}`}
            onClick={() => onPlayerClick && !p.isOwnPlayer && onPlayerClick(p)}
            style={{
              display: "grid", gridTemplateColumns: grid,
              padding: mob ? "9px 8px" : "8px 8px",
              borderBottom: `1px solid ${C.bgCard}`,
              background: i % 2 === 0 ? "transparent" : "rgba(30,41,59,0.15)",
              gap: mob ? 4 : 6,
              alignItems: "center",
              cursor: onPlayerClick && !p.isOwnPlayer ? "pointer" : "default",
              transition: "background 0.1s ease",
            }}
          >
            {/* Position chip */}
            <PositionChip position={p.position} mobile={mob} />

            {/* Name */}
            <span style={{
              fontSize: mob ? F.sm : F.md,
              color: p.isOwnPlayer ? C.green : C.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {displayName(p.name, mob)}
            </span>

            {/* Nationality flag */}
            <span style={{ textAlign: "center", fontSize: F.md }}>{flag}</span>

            {/* Age */}
            {!mob && (
              <span style={{
                textAlign: "center", fontSize: F.sm,
                color: p.age <= 21 ? C.green : p.age >= 32 ? C.red : C.textMuted,
              }}>
                {p.age || "—"}
              </span>
            )}

            {/* OVR */}
            <span style={{
              textAlign: "center", fontSize: F.md,
              color: getAttrColor(p.ovr, ovrCap), fontWeight: "bold",
            }}>
              {p.ovr}
            </span>

            {/* Scouted potential badge */}
            {scoutedPlayers?.[p.id] != null && (
              <span style={{
                fontSize: F.xs, background: "rgba(129,140,248,0.15)",
                color: "#818cf8", padding: "2px 6px", borderRadius: 8,
                fontWeight: "bold", textAlign: "center", whiteSpace: "nowrap",
              }}>
                POT {scoutedPlayers[p.id]}
              </span>
            )}

            {/* ATTRS or STATS */}
            {!mob && view === "ATTRS" && ATTRIBUTES.map(a => (
              <span key={a.key} style={{
                textAlign: "center", fontSize: F.sm,
                color: getAttrColor(p.attrs?.[a.key] || 0, ovrCap),
              }}>
                {p.attrs?.[a.key] || 0}
              </span>
            ))}

            {!mob && view === "STATS" && STAT_COLS.map(s => {
              if (s.key === "avg") {
                return <span key="avg" style={{ textAlign: "center", fontSize: F.sm, color: avgColor }}>{avg}</span>;
              }
              const val = stats[s.key] || 0;
              return (
                <span key={s.key} style={{
                  textAlign: "center", fontSize: F.sm,
                  color: val > 0 ? s.color : C.bgInput,
                }}>
                  {val || "—"}
                </span>
              );
            })}

            {/* Club */}
            {mob ? (
              <span style={{
                fontSize: F.micro, color: C.textDim,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                textAlign: "right",
              }}>
                {p.clubName}
              </span>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                <ClubBadge name={p.clubName} color={p.clubColor} size={18} />
                <div style={{ overflow: "hidden", minWidth: 0 }}>
                  <div style={{
                    fontSize: F.xs, color: C.textMuted,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.clubName}
                  </div>
                  <div style={{ fontSize: F.micro, color: C.bgInput, marginTop: 2 }}>{league}</div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", fontSize: F.xs, color: C.bgInput,
          fontFamily: FONT }}>
          No players match these filters
        </div>
      )}

      {/* Advanced Filter Modal */}
      {showFilters && (
        <div
          onClick={() => setShowFilters(false)}
          style={{
            position: "fixed", inset: 0, zIndex: Z.panel,
            background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, #0a0a1a 0%, #0f172a 100%)",
              border: `1px solid ${C.bgCard}`, borderRadius: 8,
              padding: mob ? "22px 20px" : "32px 42px",
              maxWidth: 780, width: mob ? "94%" : "88%",
              fontFamily: FONT,
              maxHeight: "85vh", overflowY: "auto",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <span style={{ fontSize: mob ? F.xl : F.h3, color: C.text }}>ADVANCED FILTERS</span>
              <button
                onClick={() => setShowFilters(false)}
                style={{
                  background: "none", border: "none", color: C.textDim,
                  fontSize: F.xl, cursor: "pointer", fontFamily: FONT,
                }}
              >
                ✕
              </button>
            </div>

            {/* Position toggles */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: F.xs, color: C.slate, display: "block", marginBottom: 12 }}>POSITION</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {POSITION_ORDER.map(pos => {
                  const active = (draft.positions || []).includes(pos);
                  return (
                    <button
                      key={pos}
                      onClick={() => setDraft(prev => {
                        const cur = prev.positions || [];
                        return { ...prev, positions: active ? cur.filter(p => p !== pos) : [...cur, pos] };
                      })}
                      style={{
                        padding: "8px 14px", fontSize: F.sm,
                        fontFamily: FONT,
                        background: active ? "rgba(74,222,128,0.12)" : "#0f172a",
                        border: active ? "1px solid #4ade8055" : `1px solid ${C.bgInput}`,
                        color: active ? C.green : C.textDim,
                        borderRadius: 4, cursor: "pointer",
                      }}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderBottom: `1px solid ${C.bgCard}`, margin: "10px 0 18px" }} />

            {/* AGE + OVR rows */}
            {FILTER_ROWS.slice(0, 2).map(row => (
              <div key={row.key} style={{
                display: "flex", alignItems: "center", gap: 14,
                marginBottom: 18, padding: "8px 0",
              }}>
                <span style={{ fontSize: F.md, color: row.color, width: 52, flexShrink: 0 }}>{row.label}</span>
                <input
                  type="number"
                  min={row.range[0]}
                  max={row.range[1]}
                  placeholder={String(row.range[0])}
                  value={draft[`${row.key}_min`] ?? ""}
                  onChange={e => setDraft(prev => ({ ...prev, [`${row.key}_min`]: e.target.value }))}
                  style={{
                    width: 80, textAlign: "center", background: "#0f172a",
                    border: `1px solid ${C.bgInput}`, color: C.text,
                    fontSize: F.sm, fontFamily: FONT,
                    padding: "10px 8px", borderRadius: 4, outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e => e.target.style.borderColor = C.bgInput}
                />
                <span style={{ fontSize: F.sm, color: C.slate }}>—</span>
                <input
                  type="number"
                  min={row.range[0]}
                  max={row.range[1]}
                  placeholder={String(row.range[1])}
                  value={draft[`${row.key}_max`] ?? ""}
                  onChange={e => setDraft(prev => ({ ...prev, [`${row.key}_max`]: e.target.value }))}
                  style={{
                    width: 80, textAlign: "center", background: "#0f172a",
                    border: `1px solid ${C.bgInput}`, color: C.text,
                    fontSize: F.sm, fontFamily: FONT,
                    padding: "10px 8px", borderRadius: 4, outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = C.green}
                  onBlur={e => e.target.style.borderColor = C.bgInput}
                />
              </div>
            ))}

            {/* Separator */}
            <div style={{ borderBottom: `1px solid ${C.bgCard}`, margin: "10px 0 18px" }} />

            {/* Nationality */}
            <div style={{
              display: "flex", alignItems: "center", gap: 14,
              marginBottom: 18, padding: "8px 0",
            }}>
              <span style={{ fontSize: F.md, color: C.textMuted, width: 52, flexShrink: 0 }}>NAT</span>
              <GameDropdown
                value={draft.nat || "ALL"}
                options={natOptions}
                onChange={v => setDraft(prev => ({ ...prev, nat: v }))}
                maxHeight={240}
              />
            </div>

            {/* Separator */}
            <div style={{ borderBottom: `1px solid ${C.bgCard}`, margin: "10px 0 18px" }} />

            {/* Attribute rows — two-column on desktop */}
            <div style={{
              display: "grid",
              gridTemplateColumns: mob ? "1fr" : "1fr 1fr",
              gap: mob ? "0px" : "6px 32px",
            }}>
              {FILTER_ROWS.slice(2).map(row => (
                <div key={row.key} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  marginBottom: 18, padding: "8px 0",
                }}>
                  <span style={{ fontSize: F.md, color: row.color, width: 52, flexShrink: 0 }}>{row.label}</span>
                  <input
                    type="number"
                    min={row.range[0]}
                    max={row.range[1]}
                    placeholder={String(row.range[0])}
                    value={draft[`${row.key}_min`] ?? ""}
                    onChange={e => setDraft(prev => ({ ...prev, [`${row.key}_min`]: e.target.value }))}
                    style={{
                      width: 80, textAlign: "center", background: "#0f172a",
                      border: `1px solid ${C.bgInput}`, color: C.text,
                      fontSize: F.sm, fontFamily: FONT,
                      padding: "10px 8px", borderRadius: 4, outline: "none",
                    }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.bgInput}
                  />
                  <span style={{ fontSize: F.sm, color: C.slate }}>—</span>
                  <input
                    type="number"
                    min={row.range[0]}
                    max={row.range[1]}
                    placeholder={String(row.range[1])}
                    value={draft[`${row.key}_max`] ?? ""}
                    onChange={e => setDraft(prev => ({ ...prev, [`${row.key}_max`]: e.target.value }))}
                    style={{
                      width: 80, textAlign: "center", background: "#0f172a",
                      border: `1px solid ${C.bgInput}`, color: C.text,
                      fontSize: F.sm, fontFamily: FONT,
                      padding: "10px 8px", borderRadius: 4, outline: "none",
                    }}
                    onFocus={e => e.target.style.borderColor = C.green}
                    onBlur={e => e.target.style.borderColor = C.bgInput}
                  />
                </div>
              ))}
            </div>

            {/* Separator */}
            <div style={{ borderBottom: `1px solid ${C.bgCard}`, margin: "12px 0 22px" }} />

            {/* Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <button
                onClick={() => setDraft({})}
                style={{
                  ...sel, padding: "12px 24px", fontSize: F.sm,
                  color: C.textDim, border: `1px solid ${C.bgInput}`, background: "#0f172a",
                }}
              >
                CLEAR ALL
              </button>
              <button
                onClick={() => {
                  setAdvFilters({ ...draft });
                  if (draft.nat && draft.nat !== "ALL") setFilterNat(draft.nat);
                  else if (advFilters.nat && (!draft.nat || draft.nat === "ALL")) setFilterNat("ALL");
                  setShowFilters(false);
                  setPage(0);
                }}
                style={{
                  ...sel, padding: "12px 30px", fontSize: F.sm,
                  color: C.green, border: "1px solid #4ade8055",
                  background: "rgba(74,222,128,0.15)",
                }}
              >
                APPLY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (() => {
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
        const from = page * PAGE_SIZE + 1;
        const to = Math.min((page + 1) * PAGE_SIZE, filtered.length);
        return (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 12, padding: "16px 0 8px",
            fontFamily: FONT, fontSize: F.xs,
          }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                ...sel, padding: "8px 14px",
                color: page === 0 ? C.bgCard : C.textMuted,
                cursor: page === 0 ? "default" : "pointer",
              }}
            >
              ◀ PREV
            </button>
            <span style={{ color: C.textDim, fontSize: F.micro }}>
              {from}–{to} OF {filtered.length}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              style={{
                ...sel, padding: "8px 14px",
                color: page >= totalPages - 1 ? C.bgCard : C.textMuted,
                cursor: page >= totalPages - 1 ? "default" : "pointer",
              }}
            >
              NEXT ▶
            </button>
          </div>
        );
      })()}
    </div>
  );
}
