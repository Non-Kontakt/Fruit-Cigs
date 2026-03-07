import React, { useState, useEffect } from "react";
import { getArcById } from "../../utils/arcs.js";
import { SFX } from "../../utils/sfx.js";
import { F, C, FONT, MODAL, Z } from "../../data/tokens";

export function ArcStepModal({ notification, onDismiss, onViewArcs, isOnHoliday }) {
  const mob = window.innerWidth <= 768;
  const [animated, setAnimated] = useState(false);

  // Fire SFX and start animation when THIS modal actually mounts/appears
  useEffect(() => {
    if (!notification) return;
    setAnimated(false); // Reset for new notification
    // SFX fires now — when user actually sees the modal
    if (!isOnHoliday) {
      if (notification.isComplete) { SFX.breakthrough(); } else { SFX.arcStep(); }
    }
    // Animate: delay then flip the "just done" step from empty → filled
    const timer = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(timer);
  }, [notification?.arcId, notification?.stepIdx, isOnHoliday]); // re-trigger if notification changes

  // Auto-close when on holiday
  useEffect(() => {
    if (isOnHoliday) {
      const timer = setTimeout(() => onDismiss(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOnHoliday, onDismiss]);

  if (!notification) return null;
  const { arcId, arcName, arcIcon, stepIdx, stepDesc, narrative, gains, isComplete, rewardDesc, cat } = notification;
  const catColor = { player:"#a78bfa", club:C.blue, legacy:C.amber };
  const col = catColor[cat] || C.blue;

  return (
    <div style={{
      ...MODAL.backdrop, zIndex: Z.modal,
      background:"rgba(0,0,0,0.8)",
    }} onClick={onDismiss}>
      <div style={{
        background:C.bg, border:`2px solid ${col}`,
        padding:mob?"26px 20px":"36px 42px",
        maxWidth:480, width:mob?"94%":"88%",
        boxShadow:`0 0 40px ${col}33, 0 0 80px ${col}11`,
        textAlign:"center",
      }} onClick={e => e.stopPropagation()}>
        {/* Arc icon + name */}
        <div style={{ fontSize:mob?F.h3:F.h1, marginBottom:8 }}>{arcIcon}</div>
        <div style={{ fontSize:mob?F.sm:F.md, color:col, letterSpacing:2, marginBottom:4 }}>
          {isComplete ? "ARC COMPLETE" : "STEP COMPLETE"}
        </div>
        <div style={{ fontSize:mob?F.xs:F.sm, color:C.text, marginBottom:12 }}>{arcName}</div>

        {/* Step chain mini visualization with animation */}
        <div style={{ display:"flex", justifyContent:"center", gap:mob?3:4, alignItems:"center", marginBottom:16 }}>
          {Array.from({length: (getArcById(arcId)?.steps?.length || 4)}).map((_, i) => {
            const justDone = i === stepIdx;
            // Before animation: justDone step shows as empty; after: filled
            const done = i < stepIdx || (justDone && animated);
            const showNumber = !done;
            return (
              <React.Fragment key={i}>
                {i > 0 && <div style={{ width:mob?8:13, height:3, background:done||(i<stepIdx)?col:C.bgInput, transition:"background 0.5s" }} />}
                <div style={{
                  width:mob?23:29, height:mob?23:29, borderRadius:"50%",
                  border:`2px solid ${done?col:justDone?col:C.bgInput}`,
                  background:done?col:justDone?"transparent":"transparent",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontWeight:"bold",
                  boxShadow:justDone && animated?`0 0 16px ${col}, 0 0 32px ${col}55`:"none",
                  transition:"all 0.5s ease",
                  transform:justDone && animated?"scale(1.15)":"scale(1)",
                }}>
                  {done ? (
                    <div style={{
                      width:mob?8:10, height:mob?13:17,
                      borderRight:`2.5px solid #fff`,
                      borderBottom:`2.5px solid #fff`,
                      transform:"rotate(45deg)",
                      opacity: animated ? 1 : 0,
                      transition: "opacity 0.3s ease",
                      marginTop: mob?-2:-3,
                      filter:`drop-shadow(0 0 4px ${col})`,
                    }} />
                  ) : (
                    <span style={{ fontSize:mob?F.micro:F.xs, color:C.slate }}>{i+1}</span>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          <div style={{ width:mob?8:13, height:3, background:isComplete?C.green:C.bgInput }} />
          <div style={{
            width:mob?26:31, height:mob?26:31, borderRadius:"50%",
            border:`2px solid ${isComplete?C.green:C.bgInput}`,
            background:isComplete?C.green:"transparent",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:mob?F.sm:F.md, color:isComplete?C.bg:C.slate,
          }}>🏆</div>
        </div>

        {/* Step description */}
        <div style={{
          background:`${col}11`, border:`1px solid ${col}33`,
          padding:"13px 18px", marginBottom:12,
        }}>
          <div style={{ fontSize:mob?F.micro:F.xs, color:C.textDim, marginBottom:4 }}>
            {isComplete ? "FINAL STEP" : `STEP ${stepIdx + 1}`}
          </div>
          <div style={{ fontSize:mob?F.xs:F.sm, color:C.text }}>✓ {stepDesc}</div>
        </div>

        {/* Narrative */}
        {narrative && (
          <div style={{
            fontSize:mob?F.xs:F.sm, color:C.textMuted, lineHeight:1.8,
            marginBottom:12, fontStyle:"italic", padding:"0 10px",
          }}>
            "{narrative}"
          </div>
        )}

        {/* Gains summary */}
        {gains && (
          <div style={{
            background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)",
            padding:"10px 16px", marginBottom:12, fontSize:mob?F.micro:F.xs, color:C.green,
          }}>
            📈 {gains}
          </div>
        )}

        {/* Reward for completion */}
        {isComplete && rewardDesc && (
          <div style={{
            background:"rgba(250,204,21,0.1)", border:"1px solid rgba(250,204,21,0.3)",
            padding:"13px 18px", marginBottom:12,
          }}>
            <div style={{ fontSize:mob?F.micro:F.xs, color:C.amber, marginBottom:4 }}>🏆 REWARD UNLOCKED</div>
            <div style={{ fontSize:mob?F.xs:F.sm, color:"#fde68a" }}>{rewardDesc}</div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:16, flexDirection:mob?"column":"row" }}>
          <button onClick={onViewArcs} style={{
            padding:"10px 20px", cursor:"pointer",
            background:`${col}22`, border:`1px solid ${col}`,
            color:col, fontSize:mob?F.micro:F.xs, fontFamily:FONT,
          }}>📖 VIEW ARCS</button>
          <button onClick={onDismiss} style={{
            padding:"10px 20px", cursor:"pointer",
            background:"rgba(30,41,59,0.8)", border:`1px solid ${C.slate}`,
            color:C.textMuted, fontSize:mob?F.micro:F.xs, fontFamily:FONT,
          }}>CONTINUE</button>
        </div>
      </div>
    </div>
  );
}

// ==================== STORY ARCS PANEL ====================

