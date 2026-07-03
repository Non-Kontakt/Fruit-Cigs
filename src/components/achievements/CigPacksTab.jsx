import React, { useState, useEffect, useMemo } from "react";
import { F, C, FONT, MODAL, Z } from "../../data/tokens";
import { CIG_PACKS, ACH_TO_PACK } from "../../data/cigPacks.js";
import { ACHIEVEMENTS, PLAYER_UNLOCK_ACHIEVEMENTS } from "../../data/achievements.js";
import { getAchievementProgress } from "../../data/achievementProgress.js";
import { useMobile } from "../../hooks/useMobile.js";
import { useGameStore } from "../../store/gameStore.js";
import { CigCard } from "./CigCard.jsx";
import { CigIndex } from "./CigIndex.jsx";

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
  const [view, setView] = useState("packs"); // "packs" | "list"
  const [openCardId, setOpenCardId] = useState(null);

  useEffect(() => { injectKeyframes(); }, []);

  // Close the card modal on Escape without stealing the key from the app's
  // global Escape handler (which returns to Home) — capture phase + a stop
  // lets this component win first while leaving other shortcuts untouched.
  useEffect(() => {
    if (!openCardId) return;
    const handler = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setOpenCardId(null);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [openCardId]);

  // Build pack completion data
  const packData = useMemo(() => {
    return CIG_PACKS.map((pack) => {
      const collected = pack.achievementIds.filter((id) => unlocked.has(id)).length;
      return { ...pack, collected, total: pack.achievementIds.length };
    });
  }, [unlocked]);

  // Card state for the ledger's click-through modal: collected cards always
  // show their real face; uncollected cards show progress if their pack is
  // open, or the sealed card BACK if it isn't — the ledger row already gave
  // up the name as a hint, the card itself stays face-down.
  const buildModalCard = (achId) => {
    if (unlocked.has(achId)) {
      return { state: "collected", unlockWeek: achievementUnlockWeeks[achId], progress: null };
    }
    const pack = CIG_PACKS.find((p) => p.id === ACH_TO_PACK[achId]);
    const sealed = !!pack && !unlockedPacks.has(pack.id);
    if (sealed) return { state: "hidden", unlockWeek: null, progress: null };
    return { state: "uncollected", unlockWeek: null, progress: getAchievementProgress(achId, useGameStore.getState()) };
  };

  const handleViewChange = (v) => {
    if (v === "packs" && view === "list") setSelectedPack(null); // toggling back lands on the grid top
    setOpenCardId(null);
    setView(v);
  };

  const viewToggle = (
    <div style={{ display: "flex", gap: 6 }}>
      <button
        onClick={() => handleViewChange("packs")}
        aria-label="Pack grid view"
        title="Pack grid view"
        style={{
          padding: "7px 11px", fontSize: F.sm, lineHeight: 1,
          background: view === "packs" ? "rgba(250,204,21,0.1)" : "rgba(15,15,35,0.6)",
          border: view === "packs" ? `1px solid ${C.gold}` : `1px solid ${C.bgCard}`,
          color: view === "packs" ? C.gold : C.slate,
          cursor: "pointer", fontFamily: FONT, borderRadius: 6,
        }}
      >▦</button>
      <button
        onClick={() => handleViewChange("list")}
        aria-label="Index list view"
        title="Index list view"
        style={{
          padding: "7px 11px", fontSize: F.sm, lineHeight: 1,
          background: view === "list" ? "rgba(250,204,21,0.1)" : "rgba(15,15,35,0.6)",
          border: view === "list" ? `1px solid ${C.gold}` : `1px solid ${C.bgCard}`,
          color: view === "list" ? C.gold : C.slate,
          cursor: "pointer", fontFamily: FONT, borderRadius: 6,
        }}
      >☰</button>
    </div>
  );

  const cardModal = openCardId && (() => {
    const m = buildModalCard(openCardId);
    return (
      <div data-testid="cig-card-modal" style={{ ...MODAL.backdrop, zIndex: Z.confirm }} onClick={() => setOpenCardId(null)}>
        {/* Spotlight rim — a drained or face-down card would otherwise sink
            into the dark backdrop instead of being the highlighted thing. */}
        <div
          style={{
            position: "relative",
            boxShadow: "0 0 0 3px #e9e9f2, 0 0 60px rgba(233,233,242,0.28), 0 18px 60px rgba(0,0,0,0.8)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setOpenCardId(null)}
            aria-label="Close"
            style={{
              position: "absolute", top: -14, right: -14, width: 32, height: 32, zIndex: 1,
              borderRadius: "50%", background: C.bgCard, border: `1px solid ${C.bgInput}`,
              color: C.text, fontSize: F.md, cursor: "pointer", fontFamily: FONT,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
          <CigCard
            achievementId={openCardId}
            state={m.state}
            unlockWeek={m.unlockWeek}
            progress={m.progress}
            scale={mob ? 0.95 : 1.15}
          />
        </div>
      </div>
    );
  })();

  // ── list view ──────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>{viewToggle}</div>
        <CigIndex
          unlocked={unlocked}
          unlockedPacks={unlockedPacks}
          achievementUnlockWeeks={achievementUnlockWeeks}
          seasonLength={seasonLength}
          onCardOpen={setOpenCardId}
        />
        {cardModal}
      </div>
    );
  }

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          {viewToggle}
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

        {/* Card grid */}
        <div style={{
          display: "grid",
          // Column minimums must fit the scaled card footprint (216 × scale),
          // or auto-fill packs in a column too many and the cards collide.
          gridTemplateColumns: mob
            ? "repeat(auto-fill, minmax(152px, 1fr))"
            : "repeat(auto-fill, minmax(184px, 1fr))",
          gap: mob ? 12 : 16,
          justifyItems: "center",
        }}>
          {pack.achievementIds.map((achId) => {
            if (!achById[achId]) return null;
            const got = unlocked.has(achId);
            // Subscription-free read — this tab re-renders on open, so a
            // fresh getState() per card is enough to keep meters current.
            const progress = got ? null : getAchievementProgress(achId, useGameStore.getState());
            return (
              <CigCard
                key={achId}
                achievementId={achId}
                state={got ? "collected" : "uncollected"}
                unlockWeek={got ? achievementUnlockWeeks[achId] : null}
                scale={mob ? 0.7 : 0.85}
                progress={progress}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── grid view ──────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>{viewToggle}</div>
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
        marginBottom: -4,
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
      {pack.achievementIds.some(id => PLAYER_UNLOCK_ACHIEVEMENTS.has(id)) && (
        <div style={{
          fontFamily: FONT,
          fontSize: F.micro - 1,
          color: C.gold,
          position: "relative",
          zIndex: 1,
          opacity: 0.8,
          marginTop: 2,
        }}>
          UNLOCKABLE PLAYER
        </div>
      )}
    </div>
  );
}

// Sealed-pack stack — a plain CSS mimic of the pitch's .stackcard (lattice
// pattern only, no roundel) rather than three full CigCard backs; this grid
// holds up to 32 packs so keeping the sealed state GL-free matters.
const STACK_STICKER = "#e9e9f2";
const STACK_CLIP =
  "polygon(0 6px, 3px 6px, 3px 3px, 6px 3px, 6px 0, calc(100% - 6px) 0, calc(100% - 6px) 3px, calc(100% - 3px) 3px, calc(100% - 3px) 6px, 100% 6px, 100% calc(100% - 6px), calc(100% - 3px) calc(100% - 6px), calc(100% - 3px) calc(100% - 3px), calc(100% - 6px) calc(100% - 3px), calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 3px), 3px calc(100% - 3px), 3px calc(100% - 6px), 0 calc(100% - 6px))";
const STACK_CARDS = [
  { left: "36%", top: 14, rotate: -6 },
  { left: "50%", top: 6, rotate: 3 },
  { left: "44%", top: 0, rotate: -1 },
];

// ── locked card ───────────────────────────────────────────────────
function LockedCard({ pack, mob }) {
  const cardW = mob ? 52 : 60;
  const cardH = mob ? 76 : 88;
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
      {/* Stack of sealed card backs */}
      <div style={{ position: "relative", width: "100%", height: cardH + 14 }}>
        {STACK_CARDS.map((p, i) => (
          <div key={i} style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: cardW,
            height: cardH,
            transform: `translateX(-50%) rotate(${p.rotate}deg)`,
            background: `repeating-conic-gradient(rgba(255,255,255,0.10) 0% 25%, transparent 0% 50%) 0 0 / 10px 10px,
              repeating-linear-gradient(45deg, color-mix(in srgb, ${pack.color} 78%, black) 0 8px, color-mix(in srgb, ${pack.color} 62%, black) 8px 16px),
              color-mix(in srgb, ${pack.color} 70%, black)`,
            // A thin sticker-white ring plus its own drop shadow per card is
            // what actually separates the stack visually — at this card size
            // the pitch's 4px ring was wide enough to bridge the gap between
            // cards and read as a single blob instead of three.
            boxShadow: `0 0 0 3px ${STACK_STICKER}, 0 3px 8px rgba(0,0,0,0.55)`,
            clipPath: STACK_CLIP,
          }} />
        ))}
      </div>

      {/* Unlock hint band */}
      {pack.unlockDesc && (
        <div style={{
          fontFamily: FONT,
          fontSize: F.micro - 1,
          color: pack.color,
          background: C.bg,
          boxShadow: `0 0 0 1px ${pack.color}`,
          textAlign: "center",
          letterSpacing: 1,
          padding: "5px 8px",
          transform: "rotate(-2deg)",
          maxWidth: "92%",
          position: "relative",
          zIndex: 1,
        }}>
          {pack.unlockDesc.toUpperCase()}
        </div>
      )}

      {/* Sealed count */}
      <div style={{
        fontFamily: FONT,
        fontSize: F.micro - 1,
        color: C.textDim,
        textAlign: "center",
        opacity: 0.7,
        position: "relative",
        zIndex: 1,
      }}>
        {pack.packSize} CARDS · {pack.collected} ALREADY COLLECTED
      </div>
    </div>
  );
}
