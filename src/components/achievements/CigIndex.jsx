import React, { useState } from "react";
import { F, C, FONT } from "../../data/tokens";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { CIG_PACKS, ACH_TO_PACK } from "../../data/cigPacks.js";
import { formatUnlockWeek } from "../../utils/unlockWeeks.js";
import { sortPacksForDisplay } from "../../utils/packUnlocks.js";
import { useMobile } from "../../hooks/useMobile.js";

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

// Full-collection ledger — one row per achievement, always. Sealed packs no
// longer hide WHICH cards they contain, only HOW to earn them: an uncollected
// card behind a sealed pack still shows its real name and pack, just with the
// description swapped for a "— sealed —" tease and the icon masked as "?".
export function CigIndex({ unlocked, unlockedPacks, achievementUnlockWeeks = {}, seasonLength = 48, onCardOpen }) {
  const mob = useMobile();
  const [indexSort, setIndexSort] = useState("recent");

  const getAbsWeek = (u) => {
    if (!u) return -1;
    if (typeof u === "number") return u; // migration: old format was bare absolute week
    return (u.season - 1) * (u.seasonLen || seasonLength) + u.week;
  };

  const collectedCount = unlocked.size;

  // The unlocked Set's insertion order IS the true unlock chronology (Sets
  // iterate in insertion order and the save round-trip preserves it) — the
  // week stamps alone can't order cards earned in the same week.
  const unlockOrder = new Map([...unlocked].map((id, i) => [id, i]));

  const indexRows = ACHIEVEMENTS.map(ach => {
    const pack = CIG_PACKS.find(p => p.id === ACH_TO_PACK[ach.id]) || null;
    const packSealed = !!pack && !unlockedPacks.has(pack.id);
    const collected = unlocked.has(ach.id);
    return {
      ach, pack, collected,
      // "sealed" here means "unearned, and the tease is all you get" — a
      // collected card is always shown in full, sealed pack or not.
      kind: collected ? "collected" : packSealed ? "sealed" : "uncollected",
      abs: getAbsWeek(achievementUnlockWeeks[ach.id]),
      order: unlockOrder.get(ach.id) ?? -1,
    };
  });

  // Build the flat render list for the active sort. PACK mode inserts
  // group-header pseudo-items; every row now carries its real pack, so
  // sealed-unearned rows group and sort exactly like the rest.
  const items = [];
  if (indexSort === "pack") {
    // Every pack always renders a section here (sealed packs show their
    // cards with a "— sealed —" tease rather than being hidden outright),
    // so this reuses the same status grouping as the packs-grid tab for
    // consistency, computing collected/total per pack from indexRows.
    const packsWithProgress = CIG_PACKS.map(pack => {
      const rows = indexRows.filter(r => r.pack?.id === pack.id);
      return { ...pack, collected: rows.filter(r => r.collected).length, total: pack.achievementIds.length, _rows: rows };
    });
    sortPacksForDisplay(packsWithProgress, unlockedPacks).forEach(pack => {
      const rows = pack._rows
        .slice()
        .sort((a, b) => pack.achievementIds.indexOf(a.ach.id) - pack.achievementIds.indexOf(b.ach.id));
      if (!rows.length) return;
      items.push({ header: pack.name, color: pack.color, icon: pack.icon });
      rows.forEach(row => items.push({ row }));
    });
  } else if (indexSort === "az") {
    indexRows
      .slice()
      .sort((a, b) => a.ach.name.localeCompare(b.ach.name))
      .forEach(row => items.push({ row }));
  } else { // recent (default)
    const collectedRows = indexRows.filter(r => r.collected).sort((a, b) => b.abs - a.abs || b.order - a.order);
    const uncollectedRows = indexRows.filter(r => !r.collected).sort((a, b) => a.ach.name.localeCompare(b.ach.name));
    [...collectedRows, ...uncollectedRows].forEach(row => items.push({ row }));
  }

  return (
    <>
      {/* Header + sort toggles */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={{ fontSize: mob ? F.sm : F.md, color: C.textDim, letterSpacing: 1 }}>
          INDEX · {ACHIEVEMENTS.length} CARDS · <span style={{ color: C.gold }}>{collectedCount}/{ACHIEVEMENTS.length}</span> COLLECTED
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[["recent", "RECENT"], ["pack", "PACK"], ["az", "A-Z"]].map(([id, label]) => (
            <button key={id} onClick={() => setIndexSort(id)} style={{
              background: indexSort === id ? "rgba(250,204,21,0.15)" : "none",
              border: `1px solid ${indexSort === id ? "rgba(250,204,21,0.6)" : C.bgInput}`,
              color: indexSort === id ? C.gold : C.slate,
              padding: "6px 13px", fontSize: F.sm, cursor: "pointer",
              fontFamily: FONT, letterSpacing: 0.5,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Ledger */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {items.map((item, i) => {
          if (item.header) {
            return (
              <div key={`h-${i}`} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: F.sm, color: item.color, letterSpacing: 1.5,
                marginTop: i === 0 ? 0 : 12, marginBottom: 2, opacity: 0.85,
              }}>
                {item.icon && <span>{item.icon}</span>}{item.header.toUpperCase()}
              </div>
            );
          }

          const { ach, pack, collected, kind } = item.row;
          const isSealed = kind === "sealed";
          const isUncollected = kind !== "collected";
          const rgb = pack ? hexToRgb(pack.color) : null;

          return (
            <div
              key={ach.id}
              data-testid="cig-index-row"
              data-kind={kind}
              onClick={() => onCardOpen?.(ach.id)}
              style={{
                display: "flex", alignItems: "center", gap: mob ? 10 : 14,
                minHeight: 60, padding: mob ? "11px 11px" : "11px 14px",
                background: collected ? "rgba(250,204,21,0.05)" : "rgba(15,15,35,0.5)",
                borderLeft: pack ? `3px solid ${pack.color}` : `3px solid ${C.bgCard}`,
                opacity: isUncollected ? 0.55 : 1,
                cursor: "pointer",
              }}
            >
              {/* Icon — frameless so it can fill its column */}
              <div style={{
                width: 34, minWidth: 34, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: collected ? 26 : 22,
                color: C.slate,
              }}>
                {collected ? ach.icon : "?"}
              </div>

              {/* Name + desc */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div data-testid="cig-index-row-name" style={{
                  fontSize: mob ? F.xs : F.sm, color: collected ? C.text : C.textMuted,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {ach.name}
                </div>
                <div style={{
                  fontSize: F.xs, color: isSealed ? C.slate : C.textDim, marginTop: 6, opacity: isSealed ? 1 : 0.7,
                  fontStyle: isSealed ? "italic" : "normal",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {isSealed ? "— sealed —" : ach.desc}
                </div>
              </div>

              {/* Pack chip */}
              <div style={{
                fontSize: F.xs, letterSpacing: 0.5, padding: "3px 8px", flexShrink: 0,
                background: pack ? `rgba(${rgb}, 0.12)` : "transparent",
                border: pack ? `1px solid rgba(${rgb}, 0.3)` : "none",
                color: pack ? pack.color : C.textDim,
              }}>
                {pack?.name}
              </div>

              {/* Timestamp */}
              <div style={{ fontSize: F.xs, color: C.textDim, minWidth: mob ? 44 : 60, textAlign: "right", flexShrink: 0 }}>
                {(collected && formatUnlockWeek(achievementUnlockWeeks[ach.id])) || "—"}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
