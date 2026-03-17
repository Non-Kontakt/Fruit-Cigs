import React, { useState, useEffect } from "react";
import { BGM, BGM_TRACKS } from "../../utils/sfx.js";
import { StoryArcsPanel } from "../arcs/StoryArcsPanel.jsx";
import { STORY_ARCS } from "../../data/storyArcs.js";
import { F, C, FONT, BTN, MODAL, CARD, Z } from "../../data/tokens";
import { LEAGUE_DEFS } from "../../data/leagues.js";
import { isMessageVisible } from "../../utils/messageUtils.js";

export function BootRoom({ settings, save, debug, inbox, calendar, calendarIndex, league, cup, calendarResults, seasonNumber, week, onExitToMenu, storyArcs, setStoryArcs, squad, setSquad, prodigalSon, leagueTier, initialTab, onAchievementCheck, onHoliday, matchweekIndex, prestigeLevel, ovrCap, gameMode = "casual", activeProfileName = null }) {
  const { matchSpeed, setMatchSpeed, soundEnabled, setSoundEnabled, autoSaveEnabled, setAutoSaveEnabled, trainingCardSpeed, setTrainingCardSpeed, matchDetail, setMatchDetail, musicEnabled, setMusicEnabled, musicVolume, setMusicVolume, disabledTracks, setDisabledTracks, instantMatch, setInstantMatch } = settings;
  const { saveGame, saveStatus, activeSaveSlot, exportSave, importSave, deleteSave, importStatus } = save;
  const { onDebugJumpTier, onDebugSetSquadOvr, onDebugWinLeague, onDebugSetPrestige } = debug;
  const { inboxMessages, setInboxMessages, onInboxChoice, onMessageRead } = inbox;
  const [activeTab, setActiveTab] = useState(initialTab || "inbox");
  // React to external tab navigation requests
  useEffect(() => { if (initialTab) setActiveTab(initialTab); }, [initialTab]);
  const [holidayConfirm, setHolidayConfirm] = useState(null); // { targetMD: number }
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [debugTierConfirm, setDebugTierConfirm] = useState(null); // { tier, name }
  const [inboxFilter, setInboxFilter] = useState("all"); // "all" | "updates" | "stories"
  const mob = window.innerWidth <= 768;

  const tabStyle = (tab) => ({
    padding: mob ? "10px 13px" : "10px 18px",
    fontSize: mob ? F.xs : F.sm,
    cursor: "pointer",
    fontFamily: FONT,
    background: activeTab === tab ? "rgba(96,165,250,0.1)" : "transparent",
    border: activeTab === tab ? `1px solid ${C.blue}` : `1px solid ${C.bgInput}`,
    color: activeTab === tab ? C.blue : C.textDim,
    borderRadius: 20,
    flex: mob ? "1 1 auto" : undefined,
    textAlign: "center",
  });

  // Calendar helper functions (from CalendarView)
  const getLeagueFixture = (leagueMD) => {
    if (!league?.fixtures?.[leagueMD]) return null;
    const fixture = league.fixtures[leagueMD].find(f => f.home === 0 || f.away === 0);
    if (!fixture) return null;
    const isHome = fixture.home === 0;
    const oppIdx = isHome ? fixture.away : fixture.home;
    const opponent = league.teams[oppIdx];
    return { opponent, isHome };
  };

  const getCupInfo = (cupRound) => {
    if (!cup?.rounds?.[cupRound]) return { opponent: null, status: cup?.playerEliminated ? "Eliminated" : "TBD" };
    const round = cup.rounds[cupRound];
    if (!round.matches || round.matches.length === 0) return { opponent: null, status: "TBD" };
    const playerMatch = round.matches.find(m => m.home?.isPlayer || m.away?.isPlayer);
    if (!playerMatch) {
      if (cup.playerEliminated) return { opponent: null, status: "Eliminated" };
      return { opponent: null, status: "TBD" };
    }
    const opponent = playerMatch.home?.isPlayer ? playerMatch.away : playerMatch.home;
    const isHome = playerMatch.home?.isPlayer;
    const neutral = playerMatch.neutral || false;
    const result = playerMatch.result;
    return { opponent, isHome, neutral, result, status: result ? "played" : "pending" };
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("inbox")} style={tabStyle("inbox")}>📨 INBOX{(() => { const unread = (inboxMessages || []).filter(m => !m.read && isMessageVisible(m, calendarIndex)).length; return unread > 0 ? <span style={{ background: C.red, color: "#fff", fontSize: F.micro, padding: "2px 7px", borderRadius: 7, marginLeft: 5, display: "inline-block", minWidth: 16, textAlign: "center", lineHeight: "12px", verticalAlign: "middle" }}>{unread}</span> : null; })()}</button>
        <button onClick={() => setActiveTab("calendar")} style={tabStyle("calendar")}>📅 CALENDAR</button>
        <button onClick={() => setActiveTab("arcs")} style={tabStyle("arcs")}>📖 ARCS{(() => { const n = ["player","club","legacy"].filter(cat => { const cs = storyArcs?.[cat]; if (!cs || cs.completed) return false; const arc = STORY_ARCS.find(a => a.id === cs.arcId); if (!arc) return false; const step = arc.steps[cs.step]; return step?.t === "focus" && !cs.focus; }).length; return n > 0 ? <span style={{ background: C.red, color: "#fff", fontSize: F.micro, padding: "2px 7px", borderRadius: 7, marginLeft: 5, display: "inline-block", minWidth: 16, textAlign: "center", lineHeight: "12px", verticalAlign: "middle" }}>{n}</span> : null; })()}</button>
        <button onClick={() => setActiveTab("settings")} style={tabStyle("settings")}>⚙️ SETTINGS</button>
      </div>

      {/* Tab content */}
      <div style={{ background: C.bg, border: `1px solid ${C.bgCard}` }}>

        {/* ===== INBOX TAB ===== */}
        {activeTab === "inbox" && (
          <div style={{ padding: mob ? "21px 14px" : "26px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 9 }}>
              <div style={{ fontSize: mob ? F.lg : F.xl, color: C.blue, letterSpacing: 1 }}>📨 MANAGER'S INBOX</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[
                  { key: "all", label: "ALL" },
                  { key: "updates", label: "UPDATES" },
                  { key: "stories", label: "STORIES" },
                ].map(f => (
                  <button key={f.key} onClick={() => setInboxFilter(f.key)} style={{
                    padding: mob ? "8px 14px" : "9px 17px",
                    fontSize: mob ? F.xs : F.sm,
                    fontFamily: FONT,
                    background: inboxFilter === f.key ? "rgba(96,165,250,0.2)" : "transparent",
                    border: `1px solid ${inboxFilter === f.key ? C.blue : C.bgInput}`,
                    color: inboxFilter === f.key ? C.blue : C.slate,
                    cursor: "pointer",
                  }}>
                    {f.label}
                  </button>
                ))}
                {(() => {
                  const hasUnread = (inboxMessages || []).some(m => !m.read && isMessageVisible(m, calendarIndex));
                  return (
                    <button onClick={hasUnread ? () => {
                      setInboxMessages(prev => prev.map(m => isMessageVisible(m, calendarIndex) ? { ...m, read: true } : m));
                    } : undefined} style={{
                      padding: mob ? "8px 14px" : "9px 17px",
                      fontSize: mob ? F.xs : F.sm,
                      fontFamily: FONT,
                      background: hasUnread ? "rgba(96,165,250,0.12)" : "transparent",
                      border: `1px solid ${hasUnread ? C.blue + "55" : C.bgCard}`,
                      color: hasUnread ? C.blue : C.bgInput,
                      cursor: hasUnread ? "pointer" : "default",
                      marginLeft: 4,
                      opacity: hasUnread ? 1 : 0.5,
                    }}>
                      ✓ READ ALL
                    </button>
                  );
                })()}
              </div>
            </div>

            {(() => {
              const RECURRING_PREFIXES = ["msg_train_", "msg_md_", "msg_cup_", "msg_lopsided_"];
              const isRecurring = (id) => RECURRING_PREFIXES.some(p => id?.startsWith(p));
              const visible = [...inboxMessages]
                .filter(m => isMessageVisible(m, calendarIndex))
                .filter(m => inboxFilter === "all" ? true : inboxFilter === "updates" ? isRecurring(m.id) : !isRecurring(m.id));
              return visible.length === 0 ? (
                <div style={{ textAlign: "center", padding: mob ? 26 : 40, fontSize: F.sm, color: C.bgInput }}>
                  {inboxMessages.length === 0 ? "No messages yet. Check back as your season progresses." : "No messages in this category."}
                </div>
              ) : (
                [...visible].reverse().map((msg) => (
                <div key={msg.id} style={{
                  padding: mob ? "21px 17px" : "24px 26px",
                  borderBottom: `1px solid ${C.bgCard}`,
                  borderLeft: msg.read ? "3px solid transparent" : `3px solid ${msg.color || C.blue}`,
                  background: msg.read ? "transparent" : "rgba(96,165,250,0.04)",
                  cursor: msg.read ? "default" : "pointer",
                }} onClick={() => {
                  if (!msg.read) {
                    setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
                    if (onMessageRead) onMessageRead();
                  }
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                    <span style={{ fontSize: mob ? F.md : F.lg, color: msg.color || C.blue }}>
                      {msg.icon} {msg.title} {!msg.read && <span style={{ fontSize: F.micro, color: C.red, marginLeft: 5 }}>● NEW</span>}
                    </span>
                    <span style={{ fontSize: F.xs, color: C.bgInput }}>S{msg.season} W{msg.week}</span>
                  </div>
                  <div style={{ fontSize: F.md, color: C.textMuted, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                    {msg.body}
                  </div>
                  {/* Choice result display */}
                  {msg.choiceResult && (
                    <div style={{ fontSize: mob ? F.xs : F.sm, color: msg.choiceResult === "accept" ? C.green : C.lightRed, marginTop: 9, fontStyle: "italic" }}>
                      ✓ {msg.choiceResult === "accept" ? (msg.type === "prodigal_offer" ? "You welcomed him back." : msg.type === "free_agent_offer" ? "You signed the player." : "You accepted the trial.") : "You declined."}
                    </div>
                  )}
                  {/* Follow-up info */}
                  {msg.followUp && (
                    <div style={{ fontSize: mob ? F.xs : F.sm, color: C.amber, marginTop: 7, lineHeight: 1.5 }}>
                      {msg.followUp}
                    </div>
                  )}
                  {/* Choice buttons (only show if not yet resolved) */}
                  {msg.choices && !msg.choiceResult && (
                    <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
                      {msg.choices.map((choice) => (
                        <button key={choice.value} onClick={(e) => {
                          e.stopPropagation();
                          // onInboxChoice returns false if blocked (e.g. squad full)
                          if (onInboxChoice && onInboxChoice(msg, choice.value) === false) return;
                          setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, choiceResult: choice.value, read: true } : m));
                        }} style={{
                          padding: mob ? "10px 17px" : "10px 24px",
                          fontSize: mob ? F.xs : F.sm,
                          fontFamily: FONT,
                          background: choice.value === "accept" ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.1)",
                          border: `1px solid ${choice.value === "accept" ? C.green : C.red}`,
                          color: choice.value === "accept" ? C.green : C.lightRed,
                          cursor: "pointer",
                        }}>
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
              );
            })()}

            <div style={{ textAlign: "center", padding: mob ? 26 : 40, fontSize: F.sm, color: C.bgCard }}>
              — End of messages —
            </div>
          </div>
        )}

        {/* ===== CALENDAR TAB ===== */}
        {activeTab === "calendar" && (
          <div style={{ padding: mob ? "21px 14px" : "26px" }}>
            {calendar ? (
              <div style={{ display: "grid", gridTemplateColumns: mob ? "47px 63px 1fr 87px" : "67px 100px 1fr 1fr", gap: "0", fontSize: F.sm }}>
                {/* Header */}
                <div style={{ padding: "14px 7px", color: C.slate, borderBottom: `1px solid ${C.bgCard}` }}>WK</div>
                <div style={{ padding: "14px 7px", color: C.slate, borderBottom: `1px solid ${C.bgCard}` }}>TYPE</div>
                <div style={{ padding: "14px 7px", color: C.slate, borderBottom: `1px solid ${C.bgCard}` }}>FIXTURE</div>
                <div style={{ padding: "14px 7px", color: C.slate, borderBottom: `1px solid ${C.bgCard}`, textAlign: "right" }}>RESULT</div>

                {calendar.map((entry, idx) => {
                  const isCurrent = idx === calendarIndex;
                  const isPlayed = idx < calendarIndex;
                  const isCup = entry.type === "cup";
                  const isDynasty = entry.type === "dynasty";
                  const isMini = entry.type === "mini";
                  const isMatchType = isCup || isDynasty || isMini;
                  const typeAccent = isMatchType ? C.amber : C.green;
                  const bgColor = isCurrent ? "rgba(74,222,128,0.1)" : isMatchType ? "rgba(251,191,36,0.04)" : entry.type === "league" ? "rgba(74,222,128,0.03)" : "transparent";
                  const borderColor = isCurrent ? C.green : C.bgCard;
                  const rowBorderLeft = isCurrent ? `3px solid ${C.green}` : isMatchType ? `3px solid ${C.amber}44` : entry.type === "league" ? `3px solid ${C.green}44` : "3px solid transparent";

                  let fixtureText = "";
                  let resultText = "";
                  let resultColor = C.textMuted;

                  if (entry.type === "dynasty") {
                    const res = calendarResults?.[idx];
                    const dLabel = entry.round === "sf" ? "Semi-Final" : "Final";
                    fixtureText = res?.oppName ? `${dLabel} vs ${res.oppName}` : dLabel;
                    if (res?.spectator) {
                      resultText = res.label || "—";
                      resultColor = C.textMuted;
                    } else if (res) {
                      resultText = `${res.playerGoals}-${res.oppGoals}`;
                      if (res.pens) resultText += ` (${res.pens.homeScore}-${res.pens.awayScore}p)`;
                      resultColor = res.won ? C.green : C.red;
                    }
                  } else if (entry.type === "mini") {
                    const res = calendarResults?.[idx];
                    const mLabel = entry.round === "sf_leg1" ? "SF Leg 1" : entry.round === "sf_leg2" ? "SF Leg 2" : "Final";
                    fixtureText = res?.oppName ? `${mLabel} vs ${res.oppName}` : mLabel;
                    if (res?.spectator) {
                      resultText = res.label || "—";
                      resultColor = C.textMuted;
                    } else if (res) {
                      resultText = `${res.playerGoals}-${res.oppGoals}`;
                      if (res.pens) resultText += ` (${res.pens.homeScore}-${res.pens.awayScore}p)`;
                      resultColor = res.won ? C.green : C.red;
                    }
                  } else if (entry.type === "league") {
                    const fix = getLeagueFixture(entry.leagueMD);
                    if (fix) {
                      fixtureText = `${fix.opponent?.name || "?"} (${fix.isHome ? "H" : "A"})`;
                    }
                    const res = calendarResults?.[idx];
                    if (res) {
                      resultText = `${res.playerGoals}-${res.oppGoals}`;
                      resultColor = res.won ? C.green : res.draw ? C.gold : C.red;
                    }
                  } else {
                    const cupInfo = getCupInfo(entry.cupRound);
                    const cupRes = calendarResults?.[idx];
                    if (cupInfo.status === "Eliminated" && cupRes) {
                      // Player lost this round — show the loss score
                      fixtureText = `${entry.cupRoundName || "Cup"} — Eliminated`;
                      resultText = `${cupRes.playerGoals}-${cupRes.oppGoals}`;
                      resultColor = C.red;
                    } else if (cupInfo.status === "Eliminated") {
                      // Future round after elimination — skip entirely
                      return null;
                    } else if (cupInfo.opponent) {
                      fixtureText = `vs ${cupInfo.opponent.name || "?"}${cupInfo.neutral ? " (N)" : cupInfo.isHome ? " (H)" : " (A)"}`;
                      if (cupRes) {
                        resultText = `${cupRes.playerGoals}-${cupRes.oppGoals}`;
                        resultColor = cupRes.won ? C.green : C.red;
                        if (cupInfo.result?.penalties) {
                          resultText += ` (${cupInfo.result.penalties.homeScore}-${cupInfo.result.penalties.awayScore}p)`;
                        }
                      }
                    } else {
                      fixtureText = "Draw TBD";
                    }
                  }

                  return (
                    <React.Fragment key={idx}>
                      <div style={{
                        padding: "14px 7px", color: isCurrent ? C.green : isPlayed ? C.textDim : C.textMuted,
                        borderBottom: `1px solid ${borderColor}`, background: bgColor,
                        borderLeft: rowBorderLeft,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{
                        padding: "14px 7px",
                        color: isPlayed ? C.bgInput : typeAccent,
                        borderBottom: `1px solid ${borderColor}`, background: bgColor,
                        fontSize: F.xs,
                      }}>
                        {isDynasty ? `DC` : isMini ? `5v5` : isCup ? `CUP` : `LGE`}
                      </div>
                      <div style={{
                        padding: "14px 7px",
                        color: isCurrent ? C.text : isPlayed ? C.textDim : C.textMuted,
                        borderBottom: `1px solid ${borderColor}`, background: bgColor,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                      }}>
                        {entry.type === "league" && <span style={{ color: isPlayed ? C.bgInput : C.green, marginRight: 7 }}>MD {entry.leagueMD + 1}</span>}
                        {isCup && <span style={{ color: isPlayed ? C.bgInput : C.amber, marginRight: 7 }}>{entry.cupRoundName}</span>}
                        {fixtureText}
                        {isCurrent && <span style={{ color: C.green, marginLeft: 9 }}>◄</span>}
                      </div>
                      <div style={{
                        padding: "14px 7px", textAlign: "right",
                        color: resultColor,
                        borderBottom: `1px solid ${borderColor}`, background: bgColor,
                      }}>
                        {resultText}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 40, fontSize: F.md, color: C.bgInput }}>
                Season calendar not yet generated
              </div>
            )}
          </div>
        )}

        {/* ===== ARCS TAB ===== */}
        {activeTab === "arcs" && (
          <div style={{ padding: mob ? "18px 12px" : "23px" }}>
            <StoryArcsPanel storyArcs={storyArcs} setStoryArcs={setStoryArcs} squad={squad} setSquad={setSquad} prodigalSon={prodigalSon} league={league} leagueTier={leagueTier} onAchievementCheck={onAchievementCheck} week={week} seasonNumber={seasonNumber} />
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {activeTab === "settings" && (
          <div style={{ padding: mob ? "18px 12px" : "23px" }}>
            <div style={{ fontSize: mob ? F.md : F.lg, color: C.blue, marginBottom: 18, letterSpacing: 1 }}>⚙️ SETTINGS</div>

            {/* Match Speed */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: F.md, color: C.text, marginBottom: 5 }}>⏱️ Match Speed</div>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate }}>Default commentary speed</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[{ val: 1, label: "1x" }, { val: 2, label: "2x" }].map(opt => (
                  <button key={opt.val} onClick={() => setMatchSpeed(opt.val)} style={{
                    fontSize: F.md, padding: "6px 15px", cursor: "pointer",
                    fontFamily: FONT,
                    background: matchSpeed === opt.val ? "rgba(74,222,128,0.15)" : "rgba(30,41,59,0.3)",
                    border: matchSpeed === opt.val ? `1px solid ${C.green}` : `1px solid ${C.bgCard}`,
                    color: matchSpeed === opt.val ? C.green : C.slate,
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Sound Effects */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: F.md, color: C.text, marginBottom: 5 }}>🔊 Sound Effects</div>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate }}>Training cards, match and UI sounds</div>
              </div>
              <button onClick={() => setSoundEnabled(!soundEnabled)} style={{
                fontSize: F.md, padding: "6px 18px", cursor: "pointer",
                fontFamily: FONT,
                background: soundEnabled ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.1)",
                border: soundEnabled ? `1px solid ${C.green}` : `1px solid ${C.red}`,
                color: soundEnabled ? C.green : C.red,
              }}>{soundEnabled ? "ON" : "OFF"}</button>
            </div>

            {/* Auto-Save */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: F.md, color: C.text, marginBottom: 5 }}>💾 Auto-Save</div>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate }}>Save automatically after each match</div>
              </div>
              <button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} style={{
                fontSize: F.md, padding: "6px 18px", cursor: "pointer",
                fontFamily: FONT,
                background: autoSaveEnabled ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.1)",
                border: autoSaveEnabled ? `1px solid ${C.green}` : `1px solid ${C.red}`,
                color: autoSaveEnabled ? C.green : C.red,
              }}>{autoSaveEnabled ? "ON" : "OFF"}</button>
            </div>

            {/* Save Management */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}` }}>
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.bgInput, marginBottom: 12, letterSpacing: 1 }}>
                SAVE MANAGEMENT {activeSaveSlot != null && <span style={{ color: C.slate }}>· SLOT {activeSaveSlot}</span>}
                {activeProfileName && <span style={{ color: C.slate }}> · {activeProfileName}</span>}
                {gameMode === "ironman" && <span style={{ color: C.lightRed, marginLeft: 8 }}>⚔ IRONMAN</span>}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {gameMode !== "ironman" && (
                <button onClick={() => saveGame()} style={{
                  flex: 1, minWidth: mob ? 100 : 120, padding: "12px 14px", cursor: "pointer",
                  fontFamily: FONT, fontSize: mob ? F.xs : F.sm,
                  background: saveStatus === "saved" ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.1)",
                  border: saveStatus === "saved" ? `1px solid ${C.green}` : `1px solid ${C.blue}`,
                  color: saveStatus === "saved" ? C.green : C.blue,
                }}>{saveStatus === "saving" ? "SAVING..." : saveStatus === "saved" ? "SAVED ✓" : "💾 SAVE"}</button>
                )}
                {gameMode !== "ironman" && (<>
                {(() => {
                  const EXPORT_STATUS = {
                    exporting:      { label: "EXPORTING...", bg: "rgba(96,165,250,0.1)", border: C.blue, color: C.blue },
                    exported:       { label: "EXPORTED ✓",  bg: "rgba(74,222,128,0.15)", border: C.green, color: C.green },
                    "export-error": { label: "EXPORT FAILED", bg: "rgba(239,68,68,0.1)", border: C.red, color: C.red },
                    "no-save":      { label: "NO SAVE",     bg: "rgba(239,68,68,0.1)", border: C.red, color: C.red },
                  };
                  const IMPORT_STATUS = {
                    importing: { label: "IMPORTING...", bg: "rgba(96,165,250,0.1)", border: C.blue, color: C.blue },
                    imported: { label: "IMPORTED ✓",  bg: "rgba(74,222,128,0.15)", border: C.green, color: C.green },
                    invalid:  { label: "INVALID FILE", bg: "rgba(239,68,68,0.1)", border: C.red, color: C.red },
                  };
                  const DEFAULT_STYLE = { bg: "rgba(30,41,59,0.3)", border: C.bgInput, color: C.textMuted };
                  const exp = EXPORT_STATUS[importStatus] || DEFAULT_STYLE;
                  const imp = IMPORT_STATUS[importStatus] || DEFAULT_STYLE;
                  return (<>
                <button onClick={exportSave} style={{
                  flex: 1, minWidth: mob ? 100 : 120, padding: "12px 14px", cursor: "pointer",
                  fontFamily: FONT, fontSize: mob ? F.xs : F.sm,
                  background: exp.bg, border: `1px solid ${exp.border}`, color: exp.color,
                }}>{exp.label || "📤 EXPORT"}</button>
                <button onClick={importSave} style={{
                  flex: 1, minWidth: mob ? 100 : 120, padding: "12px 14px", cursor: "pointer",
                  fontFamily: FONT, fontSize: mob ? F.xs : F.sm,
                  background: imp.bg, border: `1px solid ${imp.border}`, color: imp.color,
                }}>{imp.label || "📥 IMPORT"}</button>
                  </>);
                })()}
                </>)}
                {!deleteConfirm ? (
                  <button onClick={() => setDeleteConfirm(true)} style={{
                    flex: 1, minWidth: mob ? 100 : 120, padding: "12px 14px", cursor: "pointer",
                    fontFamily: FONT, fontSize: mob ? F.xs : F.sm,
                    background: "rgba(239,68,68,0.06)", border: `1px solid ${C.bgInput}`, color: C.textDim,
                  }}>🗑️ DELETE</button>
                ) : (
                  <button onClick={() => { deleteSave(); setDeleteConfirm(false); }} style={{
                    flex: 1, minWidth: mob ? 100 : 120, padding: "12px 14px", cursor: "pointer",
                    fontFamily: FONT, fontSize: mob ? F.xs : F.sm,
                    background: "rgba(239,68,68,0.15)", border: `1px solid ${C.red}`, color: C.red,
                    animation: "pulse 1.5s ease infinite",
                  }}>CONFIRM?</button>
                )}
              </div>
            </div>

            {/* Training Card Speed */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, marginRight: 9 }}>
                <div style={{ fontSize: F.md, color: C.text, marginBottom: 5 }}>🃏 Training Report</div>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate }}>How training results are shown</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[
                  { val: "full", label: "FULL" },
                  { val: "quick", label: "QUICK" },
                  { val: "summary", label: "LIST" },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setTrainingCardSpeed(opt.val)} style={{
                    fontSize: mob ? F.xs : F.sm, padding: "6px 12px", cursor: "pointer",
                    fontFamily: FONT,
                    background: trainingCardSpeed === opt.val ? "rgba(74,222,128,0.15)" : "rgba(30,41,59,0.3)",
                    border: trainingCardSpeed === opt.val ? `1px solid ${C.green}` : `1px solid ${C.bgCard}`,
                    color: trainingCardSpeed === opt.val ? C.green : C.slate,
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Match Detail */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1, marginRight: 9 }}>
                <div style={{ fontSize: F.md, color: C.text, marginBottom: 5 }}>📋 Match Detail</div>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate }}>Full commentary or key events only</div>
              </div>
              <div style={{ display: "flex", gap: 5 }}>
                {[
                  { val: "full", label: "FULL" },
                  { val: "highlights", label: "KEY" },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setMatchDetail(opt.val)} style={{
                    fontSize: mob ? F.xs : F.sm, padding: "6px 12px", cursor: "pointer",
                    fontFamily: FONT,
                    background: matchDetail === opt.val ? "rgba(74,222,128,0.15)" : "rgba(30,41,59,0.3)",
                    border: matchDetail === opt.val ? `1px solid ${C.green}` : `1px solid ${C.bgCard}`,
                    color: matchDetail === opt.val ? C.green : C.slate,
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>

            {/* BGM Section */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}` }}>
              {/* Music master toggle */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: F.md, color: C.text, marginBottom: 5 }}>🎵 Music</div>
                  <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate }}>Background music rotation</div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  {[
                    { val: true, label: "ON" },
                    { val: false, label: "OFF" },
                  ].map(opt => (
                    <button key={String(opt.val)} onClick={() => { setMusicEnabled(opt.val); BGM.setEnabled(opt.val); }} style={{
                      fontSize: mob ? F.xs : F.sm, padding: "6px 12px", cursor: "pointer",
                      fontFamily: FONT,
                      background: musicEnabled === opt.val ? (opt.val ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)") : "rgba(30,41,59,0.3)",
                      border: musicEnabled === opt.val ? (opt.val ? `1px solid ${C.green}` : `1px solid ${C.red}`) : `1px solid ${C.bgCard}`,
                      color: musicEnabled === opt.val ? (opt.val ? C.green : C.red) : C.slate,
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>

              {/* Volume slider */}
              {musicEnabled && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                    <span style={{ fontSize: mob ? F.xs : F.sm, color: C.slate, minWidth: 58 }}>Volume</span>
                    <div style={{ flex: 1, display: "flex", gap: 2, alignItems: "center" }}>
                      {[...Array(10)].map((_, i) => {
                        const threshold = (i + 1) / 10;
                        const filled = musicVolume >= threshold - 0.05;
                        return (
                          <div
                            key={i}
                            onClick={() => setMusicVolume(threshold)}
                            style={{
                              flex: 1, height: 9, cursor: "pointer",
                              background: filled ? C.green : "rgba(30,41,59,0.5)",
                              border: filled ? "1px solid #4ade8066" : `1px solid ${C.bgCard}`,
                              transition: "background 0.15s ease",
                            }}
                          />
                        );
                      })}
                    </div>
                    <span style={{ fontSize: mob ? F.xs : F.sm, color: C.green, minWidth: 35, textAlign: "right" }}>
                      {Math.round(musicVolume * 100)}%
                    </span>
                  </div>

                  {/* Track list */}
                  <div style={{ fontSize: mob ? F.xs : F.sm, color: C.bgInput, marginBottom: 7, letterSpacing: 1 }}>
                    TRACKLIST
                  </div>
                  {BGM_TRACKS.map(track => {
                    const isDisabled = disabledTracks.has(track.id);
                    const isCurrent = BGM.getCurrentTrackId() === track.id;
                    return (
                      <div key={track.id}
                        onClick={() => {
                          setDisabledTracks(prev => {
                            const next = new Set(prev);
                            if (next.has(track.id)) next.delete(track.id);
                            else next.add(track.id);
                            return next;
                          });
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 9,
                          padding: "9px 12px", cursor: "pointer",
                          borderBottom: "1px solid rgba(30,41,59,0.3)",
                          background: isCurrent ? "rgba(74,222,128,0.04)" : "transparent",
                          opacity: isDisabled ? 0.4 : 1,
                          transition: "opacity 0.2s ease",
                        }}>
                        <span style={{
                          fontSize: F.md, width: 23, textAlign: "center",
                          color: isDisabled ? C.bgInput : C.green,
                        }}>
                          {isDisabled ? "○" : "●"}
                        </span>
                        <span style={{
                          flex: 1, fontSize: mob ? F.xs : F.sm,
                          color: isCurrent ? C.green : (isDisabled ? C.bgInput : C.textMuted),
                        }}>
                          {track.title}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: mob ? F.xs : F.sm, color: C.green, animation: "pulse 2s ease infinite" }}>
                            ♪ NOW
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ fontSize: mob ? F.micro : F.xs, color: C.bgCard, marginTop: 9, textAlign: "center" }}>
                    Tap track to toggle · {BGM_TRACKS.length - disabledTracks.size} of {BGM_TRACKS.length} enabled
                  </div>
                </>
              )}
            </div>

            {/* Instant Match */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: F.md, color: C.text, marginBottom: 5 }}>⚡ Instant Match</div>
                <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate }}>Skip commentary delay (testing tool)</div>
              </div>
              <button onClick={() => setInstantMatch(!instantMatch)} style={{
                fontSize: F.md, padding: "6px 18px", cursor: "pointer",
                fontFamily: FONT,
                background: instantMatch ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.1)",
                border: instantMatch ? `1px solid ${C.green}` : `1px solid ${C.red}`,
                color: instantMatch ? C.green : C.red,
              }}>{instantMatch ? "ON" : "OFF"}</button>
            </div>

            {/* Go on Holiday */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}` }}>
              <div style={{ fontSize: F.md, color: C.text, marginBottom: 9 }}>🏖️ Go on Holiday</div>
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate, marginBottom: 9 }}>Simulate to a target matchweek (testing tool)</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {league?.fixtures && [...Array(Math.min(18, league.fixtures.length))].map((_, i) => {
                  const targetMD = i + 1;
                  const isPast = targetMD <= matchweekIndex;
                  return (
                    <button key={i} onClick={() => {
                      if (!isPast && onHoliday) {
                        setHolidayConfirm({ targetMD });
                      }
                    }} disabled={isPast} style={{
                      fontSize: mob ? F.xs : F.sm, padding: "6px 12px", cursor: isPast ? "not-allowed" : "pointer",
                      fontFamily: FONT,
                      background: isPast ? "rgba(30,41,59,0.3)" : "rgba(96,165,250,0.1)",
                      border: isPast ? `1px solid ${C.bgCard}` : `1px solid ${C.blue}`,
                      color: isPast ? C.bgInput : C.blue,
                      opacity: isPast ? 0.5 : 1,
                    }}>MD{targetMD}</button>
                  );
                })}
              </div>
            </div>

            {/* Debug Tools */}
            <div style={{ padding: mob ? "18px 15px" : "21px 23px", borderBottom: `1px solid ${C.bgCard}` }}>
              <div style={{ fontSize: F.md, color: C.text, marginBottom: 9 }}>🛠️ Debug Tools</div>
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.slate, marginBottom: 9 }}>
                Prestige testing tools
              </div>
              {/* Prestige Level selector */}
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.textDim, marginBottom: 7 }}>Set Prestige Level</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {[0, 1, 2, 3, 4, 5].map(pl => {
                  const isCurrent = pl === (prestigeLevel || 0);
                  return (
                    <button key={pl} onClick={() => {
                      if (!isCurrent && onDebugSetPrestige) onDebugSetPrestige(pl);
                    }} disabled={isCurrent} style={{
                      padding: mob ? "7px 11px" : "8px 14px",
                      fontSize: F.xs,
                      cursor: isCurrent ? "default" : "pointer",
                      fontFamily: FONT,
                      background: isCurrent ? "rgba(192,132,252,0.2)" : "rgba(30,41,59,0.3)",
                      border: isCurrent ? `1px solid ${C.purple}` : `1px solid ${C.bgCard}`,
                      color: isCurrent ? C.purple : C.textDim,
                      opacity: isCurrent ? 1 : 0.85,
                    }}>P{pl}</button>
                  );
                })}
                <span style={{ fontSize: F.xs, color: C.textDim, alignSelf: "center", marginLeft: 6 }}>
                  Cap: {ovrCap || 20}
                </span>
              </div>
              {/* Jump to League Tier */}
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.textDim, marginBottom: 7 }}>Jump to League Tier</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {Object.entries(LEAGUE_DEFS).sort((a, b) => Number(b[0]) - Number(a[0])).map(([tierStr, def]) => {
                  const tier = Number(tierStr);
                  const isCurrent = tier === leagueTier;
                  return (
                    <button key={tier} onClick={() => {
                      if (!isCurrent && onDebugJumpTier) setDebugTierConfirm({ tier, name: def.name });
                    }} disabled={isCurrent} style={{
                      padding: mob ? "7px 9px" : "8px 11px",
                      fontSize: F.xs,
                      cursor: isCurrent ? "default" : "pointer",
                      fontFamily: FONT,
                      background: isCurrent ? "rgba(96,165,250,0.2)" : "rgba(30,41,59,0.3)",
                      border: isCurrent ? `1px solid ${C.blue}` : `1px solid ${C.bgCard}`,
                      color: isCurrent ? C.blue : C.textDim,
                      opacity: isCurrent ? 1 : 0.85,
                    }}>{def.shortName}</button>
                  );
                })}
              </div>
              {/* Set Squad OVR */}
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.textDim, marginBottom: 7 }}>Set Squad OVR</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {(() => {
                  const cap = ovrCap || 20;
                  const step = Math.max(1, Math.round(cap / 4));
                  return [step, step * 2, step * 3, cap];
                })().map(ovr => (
                  <button key={ovr} onClick={() => onDebugSetSquadOvr && onDebugSetSquadOvr(ovr)} style={{
                    padding: mob ? "7px 14px" : "8px 18px",
                    fontSize: F.xs,
                    cursor: "pointer",
                    fontFamily: FONT,
                    background: "rgba(74,222,128,0.08)",
                    border: `1px solid ${C.bgCard}`,
                    color: C.green,
                  }}>OVR {ovr}</button>
                ))}
              </div>
              {/* Win League */}
              <div style={{ fontSize: mob ? F.xs : F.sm, color: C.textDim, marginBottom: 7 }}>League Table</div>
              <button onClick={() => onDebugWinLeague && onDebugWinLeague()} style={{
                padding: mob ? "7px 14px" : "8px 18px",
                fontSize: F.xs,
                cursor: "pointer",
                fontFamily: FONT,
                background: "rgba(251,191,36,0.08)",
                border: `1px solid ${C.bgCard}`,
                color: C.amber,
              }}>🏆 WIN LEAGUE</button>
            </div>

            {/* Exit to Menu */}
            {onExitToMenu && (
              <div style={{ padding: mob ? "18px 15px" : "21px 23px" }}>
                <button onClick={() => {
                  if (window.confirm("Save and exit to the main menu?")) onExitToMenu();
                }} style={{
                  width: "100%", padding: "15px", cursor: "pointer",
                  fontFamily: FONT, fontSize: mob ? F.xs : F.sm,
                  background: "rgba(239,68,68,0.08)", border: `1px solid ${C.bgInput}`, color: C.textMuted,
                  letterSpacing: 1,
                }}>🚪 EXIT TO MENU</button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Holiday Confirmation Modal */}
      {holidayConfirm && (
        <div style={{ ...MODAL.backdrop }}>
          <div style={{
            ...MODAL.box,
            border: `3px solid ${C.blue}`,
            padding: mob ? "30px 23px" : "41px 48px",
            width: mob ? "90%" : "auto",
            boxShadow: "0 0 50px rgba(96,165,250,0.3), inset 0 0 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              fontSize: mob ? F.md : F.lg,
              color: C.blue,
              marginBottom: 18,
              letterSpacing: 2,
            }}>
              🏖️ GO ON HOLIDAY
            </div>
            <div style={{
              fontSize: mob ? F.xs : F.sm,
              color: C.text,
              lineHeight: 1.8,
              marginBottom: 28,
            }}>
              Simulate to Matchweek {holidayConfirm.targetMD}?
              <br />
              This will auto-advance weeks.
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              <button onClick={() => setHolidayConfirm(null)} style={{
                padding: "15px 30px",
                fontSize: F.md,
                fontFamily: FONT,
                background: "rgba(239,68,68,0.1)",
                border: `2px solid ${C.red}`,
                color: C.red,
                cursor: "pointer",
                letterSpacing: 1,
              }}>
                CANCEL
              </button>
              <button onClick={() => {
                onHoliday(holidayConfirm.targetMD);
                setHolidayConfirm(null);
              }} style={{
                padding: "15px 30px",
                fontSize: F.md,
                fontFamily: FONT,
                background: "rgba(74,222,128,0.15)",
                border: `2px solid ${C.green}`,
                color: C.green,
                cursor: "pointer",
                letterSpacing: 1,
              }}>
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Tier Jump Confirmation Modal */}
      {debugTierConfirm && (
        <div style={{ ...MODAL.backdrop }}>
          <div style={{
            ...MODAL.box,
            border: `3px solid ${C.purple}`,
            padding: mob ? "30px 23px" : "41px 48px",
            width: mob ? "90%" : "auto",
            boxShadow: "0 0 50px rgba(192,132,252,0.3), inset 0 0 80px rgba(0,0,0,0.6)",
          }}>
            <div style={{
              fontSize: mob ? F.md : F.lg,
              color: C.purple,
              marginBottom: 18,
              letterSpacing: 2,
            }}>
              🛠️ JUMP TO TIER
            </div>
            <div style={{
              fontSize: mob ? F.xs : F.sm,
              color: C.text,
              lineHeight: 1.8,
              marginBottom: 28,
            }}>
              Jump to {debugTierConfirm.name}?
              <br />
              This will reset the current season.
            </div>
            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              <button onClick={() => setDebugTierConfirm(null)} style={{
                padding: "15px 30px",
                fontSize: F.md,
                fontFamily: FONT,
                background: "rgba(239,68,68,0.1)",
                border: `2px solid ${C.red}`,
                color: C.red,
                cursor: "pointer",
                letterSpacing: 1,
              }}>
                CANCEL
              </button>
              <button onClick={() => {
                onDebugJumpTier(debugTierConfirm.tier);
                setDebugTierConfirm(null);
              }} style={{
                padding: "15px 30px",
                fontSize: F.md,
                fontFamily: FONT,
                background: "rgba(192,132,252,0.15)",
                border: `2px solid ${C.purple}`,
                color: C.purple,
                cursor: "pointer",
                letterSpacing: 1,
              }}>
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== CALENDAR VIEW ====================
function CalendarView({ calendar, calendarIndex, league, cup, calendarResults, onClose }) {
  // Get player fixture info for a league matchday
  const getLeagueFixture = (leagueMD) => {
    if (!league?.fixtures?.[leagueMD]) return null;
    const fixture = league.fixtures[leagueMD].find(f => f.home === 0 || f.away === 0);
    if (!fixture) return null;
    const isHome = fixture.home === 0;
    const oppIdx = isHome ? fixture.away : fixture.home;
    const opponent = league.teams[oppIdx];
    return { opponent, isHome };
  };

  // Get cup opponent for a round
  const getCupInfo = (cupRound) => {
    if (!cup?.rounds?.[cupRound]) return { opponent: null, status: cup?.playerEliminated ? "Eliminated" : "TBD" };
    const round = cup.rounds[cupRound];
    if (!round.matches || round.matches.length === 0) return { opponent: null, status: "TBD" };
    const playerMatch = round.matches.find(m => m.home?.isPlayer || m.away?.isPlayer);
    if (!playerMatch) {
      if (cup.playerEliminated) return { opponent: null, status: "Eliminated" };
      return { opponent: null, status: "TBD" };
    }
    const opponent = playerMatch.home?.isPlayer ? playerMatch.away : playerMatch.home;
    const isHome = playerMatch.home?.isPlayer;
    const neutral = playerMatch.neutral || false;
    const result = playerMatch.result;
    return { opponent, isHome, neutral, result, status: result ? "played" : "pending" };
  };

  const mob = window.innerWidth <= 768;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.85)", zIndex: Z.panel, overflow: "auto",
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      paddingTop: mob ? 18 : 46, paddingBottom: 46,
    }} onClick={onClose}>
      <div style={{
        background: "#0f172a", border: `1px solid ${C.bgInput}`, maxWidth: 805, width: mob ? "96%" : "100%",
        padding: mob ? 18 : 35, fontFamily: FONT, position: "relative",
        maxHeight: "calc(100vh - 80px)", overflow: "auto", height: "fit-content",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mob ? 14 : 23 }}>
          <div style={{ fontSize: mob ? F.lg : F.h3, color: C.gold, letterSpacing: 2 }}>📅 CALENDAR</div>
          <button onClick={onClose} style={{
            background: "rgba(30,41,59,0.8)", border: `1px solid ${C.slate}`, color: C.textMuted,
            padding: mob ? "12px 18px" : "12px 23px", cursor: "pointer", fontSize: F.sm,
            fontFamily: FONT,
          }}>← BACK</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: mob ? "41px 55px 1fr 76px" : "58px 87px 1fr 1fr", gap: "0", fontSize: F.xs }}>
          {/* Header */}
          <div style={{ padding: "12px 6px", color: C.slate, borderBottom: `1px solid ${C.bgCard}` }}>WK</div>
          <div style={{ padding: "12px 6px", color: C.slate, borderBottom: `1px solid ${C.bgCard}` }}>TYPE</div>
          <div style={{ padding: "12px 6px", color: C.slate, borderBottom: `1px solid ${C.bgCard}` }}>FIXTURE</div>
          <div style={{ padding: "12px 6px", color: C.slate, borderBottom: `1px solid ${C.bgCard}`, textAlign: "right" }}>RESULT</div>

          {calendar.map((entry, idx) => {
            const isCurrent = idx === calendarIndex;
            const isPlayed = idx < calendarIndex;
            const isCup = entry.type === "cup";
            const isDynasty = entry.type === "dynasty";
            const isMini = entry.type === "mini";
            const isMatchType = isCup || isDynasty || isMini;
            const typeAccent = isMatchType ? C.amber : C.green;
            const bgColor = isCurrent ? "rgba(74,222,128,0.1)" : isMatchType ? "rgba(251,191,36,0.04)" : entry.type === "league" ? "rgba(74,222,128,0.03)" : "transparent";
            const borderColor = isCurrent ? C.green : C.bgCard;
            const rowBorderLeft = isCurrent ? `3px solid ${C.green}` : isMatchType ? `3px solid ${C.amber}44` : entry.type === "league" ? `3px solid ${C.green}44` : "3px solid transparent";

            let fixtureText = "";
            let resultText = "";
            let resultColor = C.textMuted;

            if (entry.type === "dynasty") {
              const res = calendarResults?.[idx];
              const dLabel = entry.round === "sf" ? "Semi-Final" : "Final";
              fixtureText = res?.oppName ? `${dLabel} vs ${res.oppName}` : dLabel;
              if (res?.spectator) {
                resultText = res.label || "—";
                resultColor = C.textMuted;
              } else if (res) {
                resultText = `${res.playerGoals}-${res.oppGoals}`;
                if (res.pens) resultText += ` (${res.pens.homeScore}-${res.pens.awayScore}p)`;
                resultColor = res.won ? C.green : C.red;
              }
            } else if (entry.type === "mini") {
              const res = calendarResults?.[idx];
              const mLabel = entry.round === "sf_leg1" ? "SF Leg 1" : entry.round === "sf_leg2" ? "SF Leg 2" : "Final";
              fixtureText = res?.oppName ? `${mLabel} vs ${res.oppName}` : mLabel;
              if (res?.spectator) {
                resultText = res.label || "—";
                resultColor = C.textMuted;
              } else if (res) {
                resultText = `${res.playerGoals}-${res.oppGoals}`;
                if (res.pens) resultText += ` (${res.pens.homeScore}-${res.pens.awayScore}p)`;
                resultColor = res.won ? C.green : C.red;
              }
            } else if (entry.type === "league") {
              const fix = getLeagueFixture(entry.leagueMD);
              if (fix) {
                fixtureText = `${fix.opponent?.name || "?"} (${fix.isHome ? "H" : "A"})`;
              }
              const res = calendarResults?.[idx];
              if (res) {
                resultText = `${res.playerGoals}-${res.oppGoals}`;
                resultColor = res.won ? C.green : res.draw ? C.gold : C.red;
              }
            } else {
              const cupInfo = getCupInfo(entry.cupRound);
              const cupRes = calendarResults?.[idx];
              if (cupInfo.status === "Eliminated" && cupRes) {
                fixtureText = `${entry.cupRoundName || "Cup"} — Eliminated`;
                resultText = `${cupRes.playerGoals}-${cupRes.oppGoals}`;
                resultColor = C.red;
              } else if (cupInfo.status === "Eliminated") {
                return null;
              } else if (cupInfo.opponent) {
                fixtureText = `vs ${cupInfo.opponent.name || "?"}${cupInfo.neutral ? " (N)" : cupInfo.isHome ? " (H)" : " (A)"}`;
                if (cupRes) {
                  resultText = `${cupRes.playerGoals}-${cupRes.oppGoals}`;
                  resultColor = cupRes.won ? C.green : C.red;
                  if (cupInfo.result?.penalties) {
                    resultText += ` (${cupInfo.result.penalties.homeScore}-${cupInfo.result.penalties.awayScore}p)`;
                  }
                }
              } else {
                fixtureText = "Draw TBD";
              }
            }

            return (
              <React.Fragment key={idx}>
                <div style={{
                  padding: "12px 6px", color: isCurrent ? C.green : isPlayed ? C.textDim : C.textMuted,
                  borderBottom: `1px solid ${borderColor}`, background: bgColor,
                  borderLeft: rowBorderLeft,
                }}>
                  {idx + 1}
                </div>
                <div style={{
                  padding: "12px 6px",
                  color: isPlayed ? C.bgInput : typeAccent,
                  borderBottom: `1px solid ${borderColor}`, background: bgColor,
                  fontSize: F.xs,
                }}>
                  {isDynasty ? `DC` : isMini ? `5v5` : isCup ? `CUP` : `LGE`}
                </div>
                <div style={{
                  padding: "12px 6px",
                  color: isCurrent ? C.text : isPlayed ? C.textDim : C.textMuted,
                  borderBottom: `1px solid ${borderColor}`, background: bgColor,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                }}>
                  {entry.type === "league" && <span style={{ color: isPlayed ? C.bgInput : C.green, marginRight: 7 }}>MD {entry.leagueMD + 1}</span>}
                  {isCup && <span style={{ color: isPlayed ? C.bgInput : C.amber, marginRight: 7 }}>{entry.cupRoundName}</span>}
                  {fixtureText}
                  {isCurrent && <span style={{ color: C.green, marginLeft: 9 }}>◄</span>}
                </div>
                <div style={{
                  padding: "12px 6px", textAlign: "right",
                  color: resultColor,
                  borderBottom: `1px solid ${borderColor}`, background: bgColor,
                }}>
                  {resultText}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== CUP PAGE (FULL PAGE WITH TABS) ====================

