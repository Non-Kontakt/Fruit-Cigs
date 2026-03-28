import React, { useState } from "react";
import { ARC_CATS, ARC_CAT_LABELS } from "../../data/storyArcs.js";
import { getOverall, getPosColor } from "../../utils/calc.js";
import { getArcById, getArcsForCat, getValidTargets } from "../../utils/arcs.js";
import { displayName } from "../../utils/player.js";
import { F, C, FONT, EMOJI } from "../../data/tokens";
import { useMobile } from "../../hooks/useMobile.js";

export function StoryArcsPanel({ storyArcs, setStoryArcs, squad, setSquad, prodigalSon, league, leagueTier, onAchievementCheck, week, seasonNumber }) {
  const mob = useMobile();
  const [selectingArc, setSelectingArc] = useState(null); // cat being selected
  const [selectingTarget, setSelectingTarget] = useState(null); // { cat, arcId }
  const [focusChoice, setFocusChoice] = useState(null); // { cat }
  const [confirmAbandon, setConfirmAbandon] = useState(null); // cat to confirm abandon

  const catColor = { player:"#a78bfa", club:C.blue, legacy:C.amber };

  const renderStepChain = (arc, catState) => {
    const step = catState.step;
    return (
      <div style={{ display:"flex", gap:mob?6:9, alignItems:"center", margin:"18px 0", flexWrap:"wrap" }}>
        {arc.steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const col = catColor[arc.cat];
          return (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width:mob?9:18, height:2, background:done?col:C.bgInput }} />}
              <div style={{
                width:mob?23:30, height:mob?23:30, borderRadius:"50%",
                border:`2px solid ${done?col:active?col:C.bgInput}`,
                background:done?col:active?`${col}22`:"transparent",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:F.md, color:done?"#ffffff":active?col:C.slate,
                fontWeight:"bold", fontFamily:FONT,
                boxShadow:active?`0 0 9px ${col}44`:"none",
              }}>
                {done ? <div style={{ width:mob?6:7, height:mob?10:13, borderRight:"2px solid #fff", borderBottom:"2px solid #fff", transform:"rotate(45deg)", marginTop:mob?-2:-2 }} /> : s.t === "focus" ? <span style={EMOJI}>⚡</span> : i+1}
              </div>
            </React.Fragment>
          );
        })}
        {/* Final reward node */}
        <div style={{ width:mob?9:18, height:2, background:catState.completed?C.green:C.bgInput }} />
        <div style={{
          width:mob?28:35, height:mob?28:35, borderRadius:"50%",
          border:`2px solid ${catState.completed?C.green:C.bgInput}`,
          background:catState.completed?C.green:"transparent",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:mob?F.md:F.lg, color:catState.completed?C.bg:C.slate,
        }}>🏆</div>
      </div>
    );
  };

  const renderCurrentStep = (arc, catState, cat) => {
    if (catState.completed) {
      return (
        <div style={{ padding:"12px 0" }}>
          <div style={{ color:C.green, fontSize:mob?F.xs:F.sm, marginBottom:12 }}>✅ {arc.rewardDesc}</div>
          <button onClick={() => {
            setStoryArcs(prev => ({...prev, [cat]: null}));
          }} style={{
            padding:"9px 18px", cursor:"pointer",
            background:"rgba(30,41,59,0.6)", border:`1px dashed ${catColor[cat]}66`,
            color:catColor[cat], fontSize:mob?F.xs:F.sm, fontFamily:FONT,
          }}>+ NEW ARC</button>
        </div>
      );
    }
    const step = arc.steps[catState.step];
    if (!step) return null;

    // Target selection step
    if (step.t === "target" && !catState.tracking?.targetId) {
      return (
        <div>
          <div style={{ color:C.textMuted, fontSize:mob?F.xs:F.sm, marginBottom:9 }}>{step.desc}</div>
          <button onClick={() => setSelectingTarget({ cat, arcId:arc.id })} style={{
            background:"rgba(96,165,250,0.15)", border:`1px solid ${C.blue}`, color:C.blue,
            padding:"9px 18px", cursor:"pointer", fontSize:F.sm, fontFamily:FONT,
          }}>SELECT PLAYER →</button>
        </div>
      );
    }
    if (step.t === "target" && catState.tracking?.targetId) {
      // Auto-advance past target step once selected
      return <div style={{ color:C.green, fontSize:mob?F.xs:F.sm }}>✓ Target selected</div>;
    }

    // Focus step - needs choice
    if (step.t === "focus" && !catState.focus) {
      return (
        <div>
          <div style={{ color:C.amber, fontSize:mob?F.xs:F.sm, letterSpacing:1, marginBottom:9 }}>⚡ CHOOSE YOUR FOCUS</div>
          <div style={{ display:"flex", gap:9, flexDirection:mob?"column":"row" }}>
            {["a","b"].map(ch => {
              const opt = step[ch];
              return (
                <button key={ch} onClick={() => {
                  setStoryArcs(prev => {
                    const next = {...prev, [cat]:{...prev[cat], focus:{choice:ch, weeksLeft:opt.w}}};
                    return next;
                  });
                }} style={{
                  flex:1, padding:"15px 18px", cursor:"pointer",
                  background:ch==="a"?"rgba(167,139,250,0.1)":"rgba(96,165,250,0.1)",
                  border:`1px solid ${ch==="a"?"#a78bfa":C.blue}`,
                  textAlign:"left", fontFamily:FONT,
                }}>
                  <div style={{ fontSize:mob?F.xs:F.sm, color:ch==="a"?"#a78bfa":C.blue, marginBottom:5 }}>{opt.name}</div>
                  <div style={{ fontSize:mob?F.xs:F.sm, color:C.textMuted }}>{opt.w} weeks · {opt.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Focus step - counting down
    if (step.t === "focus" && catState.focus) {
      const opt = step[catState.focus.choice];
      const pct = ((opt.w - catState.focus.weeksLeft) / opt.w) * 100;
      return (
        <div>
          <div style={{ color:C.amber, fontSize:mob?F.xs:F.sm, letterSpacing:1, marginBottom:5 }}>⚡ {opt.name}</div>
          <div style={{ background:C.bgCard, height:9, borderRadius:5, overflow:"hidden", marginBottom:5 }}>
            <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#a78bfa,#60a5fa)", transition:"width 0.3s" }} />
          </div>
          <div style={{ fontSize:mob?F.xs:F.sm, color:C.textDim }}>{catState.focus.weeksLeft} weeks remaining · {opt.desc}</div>
        </div>
      );
    }

    // Condition step
    if (step.t === "cond") {
      return <div style={{ color:C.textMuted, fontSize:mob?F.xs:F.sm }}>📋 {step.desc}</div>;
    }
    return null;
  };

  const renderCategory = (cat) => {
    const catState = storyArcs[cat];
    const arcs = getArcsForCat(cat);
    const col = catColor[cat];

    // No active arc — show selection
    if (!catState) {
      return (
        <div>
          <div style={{ fontSize:F.md, color:col, marginBottom:9, letterSpacing:1 }}>{ARC_CAT_LABELS[cat]}</div>
          {selectingArc === cat ? (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {arcs.map(arc => {
                const done = storyArcs.completed?.includes(arc.id);
                const noTargets = arc.targetFilter && getValidTargets(arc.id, squad).length === 0;
                const locked = done || noTargets;
                return (
                  <button key={arc.id} disabled={locked} onClick={() => {
                    setStoryArcs(prev => {
                      const next = {...prev, [cat]:{ arcId:arc.id, step:0, tracking:{}, focus:null, completed:false, startWeek: week || 0, startSeason: seasonNumber || 1 }};
                      // Page Turner — 3 arcs active at the same time
                      const activeCats = ["player","club","legacy"].filter(c => next[c] && !next[c].completed);
                      if (activeCats.length >= 3 && onAchievementCheck) onAchievementCheck("page_turner");
                      // We Go Again — start arc in a category with a prior completion
                      if (prev.completed?.some(id => { const a = getArcById(id); return a && a.cat === cat; })) {
                        if (onAchievementCheck) onAchievementCheck("we_go_again");
                      }
                      return next;
                    });
                    setSelectingArc(null);
                  }} style={{
                    padding:"12px 18px", textAlign:"left", cursor:locked?"not-allowed":"pointer",
                    background:locked?"rgba(30,41,59,0.3)":"rgba(30,41,59,0.8)",
                    border:`1px solid ${locked?C.bgCard:C.bgInput}`,
                    fontFamily:FONT, opacity:locked?0.4:1,
                    display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
                  }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:mob?F.xs:F.sm, color:locked?C.slate:col }}>{arc.icon} {arc.name} {done && "✓"}</div>
                      <div style={{ fontSize:mob?F.xs:F.sm, color:C.textDim, marginTop:2 }}>{arc.desc}</div>
                    </div>
                    {noTargets && (
                      <div style={{
                        fontSize:mob?F.xs:F.sm, color:C.red, textAlign:"right",
                        lineHeight:1.8, flexShrink:0,
                      }}>
                        Requires: {arc.targetDesc}
                      </div>
                    )}
                  </button>
                );
              })}
              <button onClick={() => setSelectingArc(null)} style={{
                padding:"9px 18px", background:"transparent", border:`1px solid ${C.bgInput}`,
                color:C.textDim, cursor:"pointer", fontSize:F.xs, fontFamily:FONT,
              }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setSelectingArc(cat)} style={{
              padding:"15px 21px", width:"100%", cursor:"pointer",
              background:"rgba(30,41,59,0.6)", border:`1px dashed ${col}66`,
              color:col, fontSize:mob?F.xs:F.sm, fontFamily:FONT,
            }}>+ Choose {cat} arc</button>
          )}
        </div>
      );
    }

    // Active arc
    const arc = getArcById(catState.arcId);
    if (!arc) return null;
    const targetPlayer = catState.tracking?.targetId ? squad.find(p => p.id === catState.tracking.targetId) : null;

    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
          <div style={{ fontSize:F.md, color:col, letterSpacing:1 }}>{arc.icon} {arc.name}</div>
          {!catState.completed && (
            confirmAbandon === cat ? (
              <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                <span style={{ fontSize:F.micro, color:C.red }}>Lose all progress?</span>
                <button onClick={() => {
                  setStoryArcs(prev => ({...prev, [cat]:null}));
                  setConfirmAbandon(null);
                  if (onAchievementCheck) onAchievementCheck("cold_feet");
                }} style={{
                  background:"rgba(239,68,68,0.15)", border:`1px solid ${C.red}`, color:C.red,
                  padding:"5px 12px", cursor:"pointer", fontSize:F.micro, fontFamily:FONT,
                }}>YES</button>
                <button onClick={() => setConfirmAbandon(null)} style={{
                  background:"transparent", border:`1px solid ${C.bgInput}`, color:C.textDim,
                  padding:"5px 12px", cursor:"pointer", fontSize:F.micro, fontFamily:FONT,
                }}>NO</button>
              </div>
            ) : (
              <button onClick={() => setConfirmAbandon(cat)} style={{
                background:"transparent", border:`1px solid ${C.bgInput}`, color:C.slate,
                padding:"5px 12px", cursor:"pointer", fontSize:F.micro, fontFamily:FONT,
              }}>ABANDON</button>
            )
          )}
        </div>
        <div style={{ fontSize:mob?F.xs:F.sm, color:C.textDim, marginBottom:5 }}>{arc.desc}</div>
        {targetPlayer && (
          <div style={{ fontSize:mob?F.xs:F.sm, color:C.textMuted, marginBottom:5 }}>
            🎯 {displayName(targetPlayer.name, mob)} ({targetPlayer.position}) · OVR {getOverall(targetPlayer)}
            {catState.tracking?.apps != null && ` · ${catState.tracking.apps} apps`}
          </div>
        )}
        {renderStepChain(arc, catState)}
        {renderCurrentStep(arc, catState, cat)}
      </div>
    );
  };

  // Target selection modal
  if (selectingTarget) {
    const arc = getArcById(selectingTarget.arcId);
    const valid = getValidTargets(selectingTarget.arcId, squad);
    return (
      <div>
        <div style={{ fontSize:mob?F.md:F.lg, color:C.blue, marginBottom:14 }}>Select Target: {arc?.targetDesc}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {valid.length === 0 && <div style={{ color:C.red, fontSize:F.sm }}>No eligible players!</div>}
          {valid.map(p => (
            <button key={p.id} onClick={() => {
              const cat = selectingTarget.cat;
              setStoryArcs(prev => ({
                ...prev, [cat]:{...prev[cat], step:1, tracking:{...prev[cat].tracking, targetId:p.id, apps:0, starts:0, winsWithTarget:0, motmCount:0}},
              }));
              setSelectingTarget(null);
            }} style={{
              padding:"12px 18px", textAlign:"left", cursor:"pointer",
              background:"rgba(30,41,59,0.8)", border:`1px solid ${C.bgInput}`,
              fontFamily:FONT,
            }}>
              <span style={{ background:getPosColor(p.position), color:C.bg, padding:"2px 8px", fontSize:F.xs, fontWeight:"bold", marginRight:7 }}>{p.position}</span>
              <span style={{ color:C.text, fontSize:mob?F.xs:F.sm }}>{displayName(p.name, mob)}</span>
              <span style={{ color:C.textDim, fontSize:mob?F.xs:F.sm, marginLeft:9 }}>OVR {getOverall(p)} · Age {p.age}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setSelectingTarget(null)} style={{
          marginTop:9, padding:"9px 18px", background:"transparent", border:`1px solid ${C.bgInput}`,
          color:C.textDim, cursor:"pointer", fontSize:F.xs, fontFamily:FONT,
        }}>← Back</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize:mob?F.md:F.lg, color:C.text, marginBottom:5, letterSpacing:1 }}>📖 STORY ARCS</div>
      <div style={{ fontSize:mob?F.xs:F.sm, color:C.slate, marginBottom:18 }}>Choose one arc per category. Complete steps to earn powerful rewards.</div>
      {storyArcs.completed?.length > 0 && (
        <div style={{ fontSize:mob?F.xs:F.sm, color:C.green, marginBottom:14 }}>
          ✅ Completed: {storyArcs.completed.map(id => getArcById(id)?.name).filter(Boolean).join(", ")}
        </div>
      )}
      {Object.keys(storyArcs.bonuses || {}).length > 0 && (() => {
        const b = storyArcs.bonuses;
        const parts = [];
        if (b.mentalTrainMult) parts.push(`Mental training +${Math.round(b.mentalTrainMult*100)}%`);
        if (b.trainSpeedMult) parts.push(`Training speed +${Math.round(b.trainSpeedMult*100)}%`);
        if (b.youthStatBoost) parts.push(`Youth intake +${b.youthStatBoost} stats`);
        if (b.trialStatBoost) parts.push(`Trial players +${b.trialStatBoost} stats`);
        if (b.injuryShield) parts.push(`Injury shield: ${b.injuryShield}w`);
        if (parts.length === 0) return null;
        return <div style={{ fontSize:mob?F.xs:F.sm, color:"#a78bfa", marginBottom:14 }}>🎁 Active bonuses: {parts.join(" · ")}</div>;
      })()}
      <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
        {ARC_CATS.map(cat => (
          <div key={cat} style={{
            padding:mob?"15px":"21px",
            background:"rgba(15,15,35,0.6)",
            border:`1px solid ${catColor[cat]}22`,
          }}>
            {renderCategory(cat)}
          </div>
        ))}
      </div>

    </div>
  );
}

// ==================== BOOT ROOM (ADMIN HUB) ====================

