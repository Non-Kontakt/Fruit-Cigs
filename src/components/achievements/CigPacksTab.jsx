import React, { useState, useEffect, useMemo } from "react";
import { F, C, FONT } from "../../data/tokens";
import { CIG_PACKS } from "../../data/cigPacks.js";
import { ACHIEVEMENTS } from "../../data/achievements.js";
import { useMobile } from "../../hooks/useMobile.js";

// ── helpers ────────────────────────────────────────────────────────
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

const achById = {};
ACHIEVEMENTS.forEach((a) => { achById[a.id] = a; });

// ── keyframe injection (same pattern as AchievementCabinet) ───────
const STYLE_ID = "cig-packs-styles-" + Math.random().toString(36).slice(2, 8);

function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes cigPackGlow {
      0%, 100% { box-shadow: 0 0 12px rgba(var(--cig-rgb), 0.15); }
      50%      { box-shadow: 0 0 22px rgba(var(--cig-rgb), 0.35), 0 0 40px rgba(var(--cig-rgb), 0.10); }
    }
    @keyframes cigPackFloat {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-3px); }
    }
    @keyframes cigProgressFill {
      from { width: 0%; }
    }
    @keyframes cigFadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes cigStampIn {
      0%   { transform: scale(1.6) rotate(-8deg); opacity: 0; }
      60%  { transform: scale(0.95) rotate(1deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

// ── component ─────────────────────────────────────────────────────
export function CigPacksTab({
  unlockedPacks,
  unlocked,
  achievementUnlockWeeks = {},
  calendarIndex = 0,
  seasonNumber = 1,
  seasonLength = 48,
}) {
  const mob = useMobile();
  const [selectedPack, setSelectedPack] = useState(null);

  useEffect(() => { injectKeyframes(); }, []);

  // Build pack completion data
  const packData = useMemo(() => {
    return CIG_PACKS.map((pack) => {
      const collected = pack.achievementIds.filter((id) => unlocked.has(id)).length;
      return { ...pack, collected, total: pack.achievementIds.length };
    });
  }, [unlocked]);

  // ── absolute-week helper (mirrors AchievementCabinet) ──────────
  const absNow = (seasonNumber - 1) * seasonLength + calendarIndex;
  const getAbsWeek = (u) => {
    if (!u) return -1;
    if (typeof u === "number") return u;
    return (u.season - 1) * (u.seasonLen || seasonLength) + u.week;
  };
  const isRecent = (id) => {
    const abs = getAbsWeek(achievementUnlockWeeks[id]);
    if (abs < 0) return false;
    return absNow - abs <= 4;
  };

  // ── detail view ────────────────────────────────────────────────
  if (selectedPack) {
    const pack = packData.find((p) => p.id === selectedPack);
    if (!pack) { setSelectedPack(null); return null; }
    const rgb = hexToRgb(pack.color);
    const collected = pack.collected;
    const total = pack.total;
    const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

    return (
      <div style={{ animation: "cigFadeIn 0.3s ease-out" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => setSelectedPack(null)}
            style={{
              background: "none",
              border: `1px solid ${C.bgInput}`,
              color: C.textMuted,
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: F.md,
              padding: "6px 10px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            {"<"}
          </button>
          <span style={{ fontSize: mob ? 32 : 42 }}>{pack.icon}</span>
          <div>
            <div style={{
              fontFamily: FONT,
              fontSize: mob ? F.sm : F.lg,
              color: pack.color,
              letterSpacing: 1,
              textShadow: `0 0 12px rgba(${rgb}, 0.5)`,
            }}>
              {pack.name}
            </div>
            <div style={{
              fontFamily: FONT,
              fontSize: F.xs,
              color: C.textMuted,
              marginTop: 4,
            }}>
              {collected}/{total} COLLECTED
            </div>
          </div>
        </div>

        {/* Full-width progress bar */}
        <div style={{
          height: 8,
          background: "rgba(15,15,35,0.6)",
          borderRadius: 4,
          overflow: "hidden",
          marginBottom: 20,
          border: `1px solid rgba(${rgb}, 0.2)`,
        }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${pack.colorDark}, ${pack.color})`,
            borderRadius: 4,
            animation: "cigProgressFill 0.6s ease-out",
            boxShadow: `0 0 8px rgba(${rgb}, 0.4)`,
          }} />
        </div>

        {/* Achievement list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {pack.achievementIds.map((achId) => {
            const ach = achById[achId];
            if (!ach) return null;
            const got = unlocked.has(achId);
            const recent = got && isRecent(achId);

            return (
              <div
                key={achId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: mob ? 8 : 12,
                  minHeight: 48,
                  padding: mob ? "8px 10px" : "8px 14px",
                  borderRadius: 6,
                  background: got
                    ? `linear-gradient(135deg, rgba(${hexToRgb(pack.colorDark)}, 0.15), rgba(${rgb}, 0.06))`
                    : "rgba(15,15,35,0.4)",
                  borderLeft: got
                    ? `3px solid ${pack.color}`
                    : `3px solid ${C.bgCard}`,
                  transition: "background 0.2s",
                }}
              >
                {/* Icon square */}
                <div style={{
                  width: 34,
                  height: 34,
                  minWidth: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  borderRadius: 5,
                  background: got
                    ? `rgba(${rgb}, 0.12)`
                    : "rgba(30,41,59,0.5)",
                  border: got
                    ? `1px solid rgba(${rgb}, 0.25)`
                    : `1px solid ${C.bgCard}`,
                }}>
                  {got ? ach.icon : "?"}
                </div>

                {/* Name + desc */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: FONT,
                    fontSize: mob ? F.micro : F.xs,
                    color: got ? C.text : C.textMuted,
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {ach.name}
                    {recent && (
                      <span style={{
                        marginLeft: 6,
                        fontSize: F.micro,
                        color: pack.color,
                        animation: "cigStampIn 0.4s ease-out",
                        display: "inline-block",
                      }}>NEW</span>
                    )}
                  </div>
                  <div style={{
                    fontFamily: FONT,
                    fontSize: F.micro,
                    color: got ? C.textDim : C.textDim,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    opacity: got ? 0.7 : 0.5,
                  }}>
                    {ach.desc}
                  </div>
                </div>

                {/* Right badge */}
                <div style={{
                  fontFamily: FONT,
                  fontSize: F.micro,
                  color: got ? pack.color : C.textDim,
                  minWidth: mob ? 20 : 64,
                  textAlign: "right",
                  flexShrink: 0,
                  opacity: got ? 1 : 0.4,
                }}>
                  {got ? (mob ? "\u2713" : "COLLECTED") : "\uD83D\uDD12"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── grid view ──────────────────────────────────────────────────
  return (
    <div>
      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: mob
          ? "repeat(2, 1fr)"
          : "repeat(auto-fill, minmax(180px, 1fr))",
        gap: 12,
      }}>
        {packData.map((pack, i) => {
          const isUnlocked = unlockedPacks.has(pack.id);
          return isUnlocked
            ? <UnlockedCard key={pack.id} pack={pack} index={i} mob={mob} onClick={() => setSelectedPack(pack.id)} />
            : <LockedCard key={pack.id} pack={pack} mob={mob} />;
        })}
      </div>
    </div>
  );
}

// ── unlocked card ─────────────────────────────────────────────────
function UnlockedCard({ pack, index, mob, onClick }) {
  const [hovered, setHovered] = useState(false);
  const rgb = hexToRgb(pack.color);
  const pct = pack.total > 0 ? Math.round((pack.collected / pack.total) * 100) : 0;
  const complete = pack.collected === pack.total;

  // Vending machine angle — alternating slight rotations
  const angles = [-2, 1, -1.5, 2, -1, 1.5, -2, 0.5, 1, -1, 2, -0.5, -2, 1.5, -1, 2, -0.5, 1, -1.5, 0.5];
  const angle = angles[index % angles.length];

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        "--cig-rgb": rgb,
        position: "relative",
        minHeight: mob ? 190 : 210,
        borderRadius: 10,
        padding: mob ? "16px 12px" : "20px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        background: `linear-gradient(160deg, rgba(${hexToRgb(pack.colorDark)}, 0.25) 0%, rgba(${rgb}, 0.08) 100%)`,
        border: `2px solid rgba(${rgb}, 0.4)`,
        boxShadow: hovered
          ? `0 0 24px rgba(${rgb}, 0.35), 0 0 48px rgba(${rgb}, 0.12), inset 0 1px 0 rgba(${rgb}, 0.15)`
          : `0 0 12px rgba(${rgb}, 0.15), inset 0 1px 0 rgba(${rgb}, 0.08)`,
        transform: hovered
          ? `rotate(0deg) scale(1.03)`
          : `rotate(${angle}deg) scale(1)`,
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        animation: complete ? "cigPackGlow 2.5s ease-in-out infinite" : undefined,
        overflow: "hidden",
      }}
    >
      {/* Background texture — diagonal lines */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 8px,
          rgba(${rgb}, 1) 8px,
          rgba(${rgb}, 1) 9px
        )`,
        pointerEvents: "none",
      }} />

      {/* Complete stamp */}
      {complete && (
        <div style={{
          position: "absolute",
          top: 8,
          right: 8,
          fontFamily: FONT,
          fontSize: F.micro,
          color: pack.color,
          background: `rgba(${rgb}, 0.15)`,
          border: `1px solid rgba(${rgb}, 0.3)`,
          borderRadius: 4,
          padding: "2px 5px",
          letterSpacing: 1,
          animation: "cigStampIn 0.5s ease-out",
        }}>
          FULL
        </div>
      )}

      {/* Fruit icon */}
      <div style={{
        fontSize: mob ? 36 : 42,
        lineHeight: 1,
        filter: hovered ? "drop-shadow(0 0 8px rgba(" + rgb + ", 0.5))" : "none",
        transition: "filter 0.25s",
        animation: hovered ? "cigPackFloat 1.5s ease-in-out infinite" : undefined,
        position: "relative",
        zIndex: 1,
      }}>
        {pack.icon}
      </div>

      {/* Pack name */}
      <div style={{
        fontFamily: FONT,
        fontSize: mob ? F.micro : F.xs,
        color: pack.color,
        letterSpacing: 1,
        textAlign: "center",
        textShadow: `0 0 10px rgba(${rgb}, 0.4)`,
        position: "relative",
        zIndex: 1,
        lineHeight: 1.4,
      }}>
        {pack.name}
      </div>

      {/* Count */}
      <div style={{
        fontFamily: FONT,
        fontSize: mob ? F.micro : F.xs,
        color: complete ? pack.color : C.text,
        position: "relative",
        zIndex: 1,
      }}>
        {pack.collected}/{pack.total}
      </div>

      {/* Mini progress bar */}
      <div style={{
        width: "80%",
        height: 5,
        background: "rgba(15,15,35,0.5)",
        borderRadius: 3,
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
        border: `1px solid rgba(${rgb}, 0.15)`,
      }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${pack.colorDark}, ${pack.color})`,
          borderRadius: 3,
          transition: "width 0.4s ease",
          boxShadow: pct > 0 ? `0 0 6px rgba(${rgb}, 0.4)` : undefined,
        }} />
      </div>

      {/* Pack size label */}
      <div style={{
        fontFamily: FONT,
        fontSize: F.micro - 1,
        color: C.textDim,
        position: "relative",
        zIndex: 1,
        opacity: 0.6,
      }}>
        {pack.packSize} PACK
      </div>
    </div>
  );
}

// ── locked card ───────────────────────────────────────────────────
function LockedCard({ pack, mob }) {
  return (
    <div style={{
      minHeight: mob ? 190 : 210,
      borderRadius: 10,
      padding: mob ? "16px 12px" : "20px 16px",
      cursor: "not-allowed",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      background: "rgba(15,15,35,0.8)",
      border: `1px solid ${C.bgCard}`,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle cross-hatch pattern for sealed look */}
      <div style={{
        position: "absolute",
        inset: 0,
        opacity: 0.03,
        backgroundImage: `repeating-linear-gradient(
          45deg,
          transparent,
          transparent 6px,
          rgba(255,255,255,1) 6px,
          rgba(255,255,255,1) 7px
        ), repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 6px,
          rgba(255,255,255,1) 6px,
          rgba(255,255,255,1) 7px
        )`,
        pointerEvents: "none",
      }} />

      {/* Lock icon */}
      <div style={{
        fontSize: mob ? 36 : 42,
        lineHeight: 1,
        opacity: 0.5,
        position: "relative",
        zIndex: 1,
      }}>
        {"\uD83D\uDD12"}
      </div>

      {/* Mystery name */}
      <div style={{
        fontFamily: FONT,
        fontSize: mob ? F.micro : F.xs,
        color: C.textDim,
        letterSpacing: 1,
        textAlign: "center",
        position: "relative",
        zIndex: 1,
      }}>
        ???
      </div>

      {/* Unlock hint */}
      {pack.unlockDesc && (
        <div style={{
          fontFamily: FONT,
          fontSize: F.micro - 1,
          color: C.textDim,
          textAlign: "center",
          opacity: 0.5,
          lineHeight: 1.6,
          padding: "0 6px",
          position: "relative",
          zIndex: 1,
          maxWidth: "90%",
        }}>
          {pack.unlockDesc}
        </div>
      )}
    </div>
  );
}
