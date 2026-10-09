import { useRef, useState } from "react";

import { C as TC, FONT } from "../../data/tokens";
import { ManagerAvatar, randomAvatar, FEATURE_COUNTS } from "./ManagerAvatar.jsx";

const C = { ...TC, bg: "#0a0a1a", bgCard: "rgba(30,41,59,0.6)", bgInput: "#1e293b" };
const F = {
  xl: "clamp(13px,3vw,18px)",
  lg: "clamp(10px,2.5vw,14px)",
  md: "clamp(10px,2vw,11px)",
  sm: "clamp(9px,1.5vw,10px)",
};

const FEATURE_ROWS = [
  { key: "skin", label: "SKIN" },
  { key: "hair", label: "HAIR" },
  { key: "hairColour", label: "HAIR COLOUR" },
  { key: "eyes", label: "EYES" },
  { key: "mouth", label: "MOUTH" },
  { key: "accessory", label: "ACCESSORY" },
];

export function ManagerIdentityScreen({ slotNumber, onConfirm, onBack, generateName }) {
  const [clubName, setClubName] = useState("");
  const [nameInput, setNameInput] = useState("Gaffer");
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const submitting = useRef(false);

  const cycle = (key, dir) => {
    const max = FEATURE_COUNTS[key];
    setAvatar(prev => ({ ...prev, [key]: ((prev[key] ?? 0) + dir + max) % max }));
  };

  const randomizeAll = () => {
    setAvatar(randomAvatar());
    if (generateName) setNameInput(generateName());
  };

  const canContinue = clubName.trim().length > 0 && !saving;
  const handleContinue = async event => {
    event.preventDefault();
    if (!canContinue || submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ teamName: clubName.trim(), managerName: nameInput.trim() || "Gaffer", managerAvatar: avatar });
    } catch {
      setError("Couldn't start your career. Please try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: FONT,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <form onSubmit={handleContinue} style={{ textAlign: "center", maxWidth: 460, width: "100%" }}>
        <div style={{
          fontSize: F.xl, color: C.green, letterSpacing: 2, marginBottom: 6,
          textShadow: "0 0 20px rgba(74,222,128,0.4)", lineHeight: 1.4,
        }}>
          🚬 FRUIT CIGS
        </div>
        <div style={{ fontSize: F.sm, color: C.slate, marginBottom: 24, letterSpacing: 1 }}>
          {slotNumber ? `Slot ${slotNumber} · ` : ""}New Career
        </div>

        <label htmlFor="club-name" style={{ display: "block", fontSize: F.md, color: C.textMuted, marginBottom: 12, letterSpacing: 1 }}>
          NAME YOUR CLUB
        </label>
        <input
          id="club-name"
          value={clubName}
          onChange={e => setClubName(e.target.value)}
          maxLength={20}
          required
          disabled={saving}
          placeholder="e.g. Denton FC"
          autoFocus
          style={{
            width: "100%", minWidth: 0, padding: "14px 12px", boxSizing: "border-box",
            background: C.bgInput, border: `2px solid rgba(74,222,128,0.4)`,
            color: C.text, fontSize: F.lg, fontFamily: FONT, textAlign: "center", marginBottom: 18,
          }}
        />

        <details style={{ textAlign: "left", marginBottom: 18, border: `1px solid ${C.bgInput}`, padding: 12 }}>
          <summary style={{ fontSize: F.sm, color: C.textMuted, cursor: "pointer", lineHeight: 1.8, padding: "6px 0" }}>
            YOUR MANAGER · OPTIONAL
          </summary>
          <fieldset disabled={saving} style={{ border: 0, padding: "18px 0 0", margin: 0, minWidth: 0, textAlign: "center" }}>
            {/* Avatar preview */}
            <div style={{
              display: "flex", justifyContent: "center", marginBottom: 18,
            }}>
              <ManagerAvatar avatar={avatar} size={120} />
            </div>

            {/* Feature pickers */}
            <div style={{
              background: "rgba(15,23,42,0.6)",
              border: `1px solid rgba(74,222,128,0.15)`,
              padding: "12px 14px",
              marginBottom: 16,
            }}>
              {FEATURE_ROWS.map(row => (
                <div key={row.key} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, marginBottom: 6,
                }}>
                  <button
                    type="button"
                    aria-label={`Previous ${row.label.toLowerCase()}`}
                    onClick={() => cycle(row.key, -1)}
                    style={{
                      background: "rgba(30,41,59,0.6)", border: `1px solid rgba(74,222,128,0.25)`,
                      color: C.green, fontFamily: FONT, fontSize: F.sm,
                      padding: "10px", minWidth: 44, minHeight: 44, cursor: "pointer", letterSpacing: 1,
                    }}
                  >◀</button>
                  <div style={{
                    flex: 1, fontSize: F.sm, color: C.textMuted, letterSpacing: 1,
                  }}>{row.label}</div>
                  <button
                    type="button"
                    aria-label={`Next ${row.label.toLowerCase()}`}
                    onClick={() => cycle(row.key, 1)}
                    style={{
                      background: "rgba(30,41,59,0.6)", border: `1px solid rgba(74,222,128,0.25)`,
                      color: C.green, fontFamily: FONT, fontSize: F.sm,
                      padding: "10px", minWidth: 44, minHeight: 44, cursor: "pointer", letterSpacing: 1,
                    }}
                  >▶</button>
                </div>
              ))}
            </div>

            {/* Name input */}
            <label htmlFor="manager-name" style={{ display: "block", fontSize: F.md, color: C.textMuted, marginBottom: 10, letterSpacing: 1 }}>
              NAME YOUR MANAGER
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                id="manager-name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value.slice(0, 20))}
                placeholder="e.g. Brian Clough"
                style={{
                  flex: 1, minWidth: 0, padding: "12px 14px", boxSizing: "border-box",
                  background: C.bgInput, border: `2px solid rgba(74,222,128,0.4)`,
                  color: C.text, fontSize: F.lg,
                  fontFamily: FONT, textAlign: "center",
                }}
              />
              {generateName && (
                <button
                  type="button"
                  onClick={() => setNameInput(generateName())}
                  title="Random name"
                  style={{
                    padding: "0 14px",
                    background: "rgba(30,41,59,0.6)",
                    border: `2px solid rgba(74,222,128,0.4)`,
                    color: C.green, fontFamily: FONT, fontSize: F.lg,
                    cursor: "pointer",
                  }}
                >🎲</button>
              )}
            </div>

            {/* Randomize all + continue */}
            <button
              type="button"
              onClick={randomizeAll}
              style={{
                width: "100%", padding: "10px",
                background: "rgba(30,41,59,0.4)",
                border: `1px solid rgba(74,222,128,0.25)`,
                color: C.green, fontFamily: FONT, fontSize: F.sm,
                cursor: "pointer", letterSpacing: 1, marginBottom: 8,
              }}
            >🎲 RANDOMIZE ALL</button>

          </fieldset>
        </details>

        <div style={{ fontSize: F.sm, color: C.textMuted, lineHeight: 1.8, marginBottom: 18 }}>
          Your career saves automatically.<br />If the board sacks you, it ends.
        </div>
        {error && <div role="alert" style={{ color: C.lightRed, fontSize: F.sm, lineHeight: 1.8, marginBottom: 12 }}>{error}</div>}

        <button
          type="submit"
          disabled={!canContinue}
          style={{
            width: "100%", padding: "14px",
            background: canContinue ? "linear-gradient(180deg,#166534,#14532d)" : "rgba(30,41,59,0.3)",
            border: canContinue ? `2px solid ${C.green}` : `1px solid rgba(30,41,59,0.8)`,
            color: canContinue ? C.green : C.slate,
            fontFamily: FONT, fontSize: F.md, cursor: canContinue ? "pointer" : "default",
            letterSpacing: 2, marginBottom: 8,
            animation: canContinue ? "glow 2s ease infinite" : "none",
          }}
        >{saving ? "STARTING..." : "NEW GAME ▶"}</button>

        {onBack && <button
          type="button"
          disabled={saving}
          onClick={onBack}
          style={{
            width: "100%", padding: "10px",
            background: "none", border: `1px solid rgba(30,41,59,0.8)`,
            color: C.slate, fontFamily: FONT, fontSize: F.sm, cursor: "pointer",
          }}
        >◀ BACK</button>}
      </form>
    </div>
  );
}
