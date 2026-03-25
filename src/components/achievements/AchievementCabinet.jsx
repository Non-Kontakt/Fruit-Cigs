import React, { useState, useEffect, useRef } from "react";
import { ATTRIBUTES } from "../../data/training.js";
import { F, C, FONT } from "../../data/tokens";
import { ACHIEVEMENTS, LEGENDARY_ACHIEVEMENTS, PRESTIGIOUS_ACHIEVEMENTS, PLAYER_UNLOCK_ACHIEVEMENTS, UNLOCKABLE_PLAYERS } from "../../data/achievements.js";
import { LEAGUE_DEFS } from "../../data/leagues.js";
import { CUP_DEFS } from "../../data/cups.js";
import { TICKET_DEFS } from "../../data/tickets.js";
import { getOverall, getPosColor, getAttrColor } from "../../utils/calc.js";
import { displayName } from "../../utils/player.js";
import { useMobile } from "../../hooks/useMobile.js";
import { CigPacksTab } from "./CigPacksTab.jsx";

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

export function AchievementCabinet({ unlocked, unlockedPacks, achievementUnlockWeeks = {}, calendarIndex = 0, seasonNumber = 1, seasonLength = 48, squad, clubHistory, currentTier, ovrCap = 20,
  tickets, retiringPlayers, transferFocus, doubleTrainingWeek,
  twelfthManActive, youthCoupActive, pendingFreeAgent, shortlist, scoutedPlayers, testimonialPlayer,
  rewindableMatches,
  onUseTicket, onViewAchievements, hasUnseenAchievements = false, gameMode = "casual", isTainted = false }) {
  const isCasual = gameMode === "casual";
  const mob = useMobile();
  const [tab, setTab] = useState("cigs");
  const [cigsKey, setCigsKey] = useState(0);
  const [filterCat, setFilterCat] = useState(null);
  const handleTabChange = (newTab) => {
    if (newTab === "cigs" && onViewAchievements) onViewAchievements();
    if (newTab === "cigs" && tab === "cigs") setCigsKey(k => k + 1); // reset drill-in
    setTab(newTab);
  };
  const [ticketPicker, setTicketPicker] = useState(null);
  const achStyleId = React.useRef("ach-styles-" + Math.random().toString(36).slice(2, 8));
  const ticketPickerPanelRef = useRef(null);

  // Trophy data from club history
  const leagueTrophies = {};
  (clubHistory?.seasonArchive || []).forEach(s => {
    if (s.position === 1) leagueTrophies[s.tier] = (leagueTrophies[s.tier] || 0) + 1;
  });
  const cupTrophies = {};
  (clubHistory?.cupHistory || []).forEach(c => {
    if (c.winnerIsPlayer) cupTrophies[c.cupName] = (cupTrophies[c.cupName] || 0) + 1;
  });

  // Tiers the player has discovered: current tier + any tier in seasonArchive
  const discoveredTiers = new Set();
  if (currentTier) discoveredTiers.add(currentTier);
  (clubHistory?.seasonArchive || []).forEach(s => { if (s.tier) discoveredTiers.add(s.tier); });
  // Tiers 5+ (Premier and below) are always visible; tiers 1-4 require discovery
  const isTierVisible = (t) => t >= 5 || discoveredTiers.has(t);

  const ALL_LEAGUES = Object.entries(LEAGUE_DEFS).map(([tier, def]) => ({
    tier: Number(tier), name: def.name, shortName: def.shortName,
    color: def.color || C.textMuted,
    icon: Number(tier) <= 4 ? "🏆" : Number(tier) <= 8 ? "🥇" : "🎖️",
    wins: leagueTrophies[Number(tier)] || 0,
    visible: isTierVisible(Number(tier)),
  })).sort((a, b) => b.tier - a.tier); // tier 11 (bottom) first → tier 1 (top) last

  const ALL_CUPS = [
    { key: "sub_money", ...CUP_DEFS.sub_money, wins: cupTrophies[CUP_DEFS.sub_money.name] || 0 },
    { key: "clubman", ...CUP_DEFS.clubman, wins: cupTrophies[CUP_DEFS.clubman.name] || 0 },
    { key: "global", ...CUP_DEFS.global, wins: cupTrophies[CUP_DEFS.global.name] || 0, visible: CUP_DEFS.global.tiers.some(t => isTierVisible(t)) },
    { key: "ultimate", ...CUP_DEFS.ultimate, wins: cupTrophies[CUP_DEFS.ultimate.name] || 0, visible: CUP_DEFS.ultimate.tiers.some(t => isTierVisible(t)) },
  ];

  const ACH_CATS = [
    { label: "Matches", icon: "⚽", ids: new Set(["first_win","clean_sheet","bore_draw","no_comment","score_draw","total_football","clinical","smash_grab","snoozefest","fergie_time","last_gasp","comeback","early_exits","hat_trick","all_four_of_them","fox_box","perfect_motm","slim_motm","wonderkid","captain_material","mr_consistent","dirty_harry","seeing_red","rotation","out_of_pos","bench_best","all_or_nothing","bench_fwd","benchwarmer","double_pivot","emergency_gk","safe_hands","family","old_guard","well_seasoned","baby_faced","dads_army","park_the_bus","total_voetbal","asymmetry","super_sub","injections","brace_yourself","up_for_a_corner","needs_must","taxi_for","absolute_cinema","heads_up","fresh_legs","hes_changed_it","whats_he_doing","false_nine","get_it_in_the_mixer","jumpers_for_goalposts","good_engine","liquid_football","lazy_sunday","inverted_wingers","guard_of_honour","not_a_dry_eye","nom_de_guerre","one_more_year","instant_impact","lazarus","made_it_his_own"]) },
    { label: "Cups & Titles", icon: "🏆", ids: new Set(["cup_winner","cup_upset","cup_final_loss","cup_exit_r32","nerves_of_steel","heartbreak","perfect_five","sudden_death","the_double","wembley","do_it_cold","catenaccio","professional_job","champion","promoted","relegated","top_flight","invincibles","centurions","back_to_back","yo_yo","free_fall","cup_collector","win_sunday","win_non_league","win_conference","win_league_two","win_league_one","win_championship","win_premier","win_saudi","win_european","win_world_xi","win_intergalactic","win_sub_money","win_clubman","win_global","win_ultimate","tinpot_treble","sunday_to_stars","dynasty"]) },
    { label: "Training", icon: "🏋️", ids: new Set(["first_gain","through_the_roof","duo_boost","tinkerer","only_fans","npc","finish_food","gym_rats","speed_freaks","cursed","stat_15","stat_20","centurion","our_academy","peak_perf","golden_gen","maxed_out","youth_grad","fresh_blood","old_faithful","testimonial","level_up","rising_tide","1up_addict","shape_shifter","new_tricks","sick_as_a_parrot","exceeded_expectations","late_bloomer","the_sick_note","sweat_equity"]) },
    { label: "The Season", icon: "📅", ids: new Set(["unbeaten_10","draw_specialists","vote_confidence","manager_month","injury_prone","heavy_metal","clean_5","goals_50","no_cutting","fortress","on_the_road","respect_badge","no_cards","great_escape","mid_table","squeaky","tots_league_one","tots_championship","tots_premier","tots_premier_3","tots_premier_5","aguero","flat_track","big_game","efficient_machine","tactical_foul","bag_man","mentality_monsters","shooting_blanks","wooden_spoon","open_all_hours","away_day_merchants","formation_roulette","comeback_season","absentee_landlord"]) },
    { label: "Career", icon: "🗺️", ids: new Set(["journeyman","season_5","always_bridesmaid","from_the_bottom","reality_check","opportunity_cost","deep_end","trials_hd","remember_me","kolo_kolo","first_name_terms","deja_vu_training","brothers_in_arms","legendary_dynasty","golden_boot","fifty_not_out","remember_the_name","left_on_read","paper_round","prodigal_son","just_a_niggle","all_timers","brexit","true_strike","purist","our_man","on_your_head_son","one_club_man","fan_favourite","veteran","scouts_honour","end_of_an_era","galacticos","all_time_top","century_club","promised_land","cult_hero","worth_the_wait","golden_ticket","ticket_tout","the_network","best_of_friends","the_dossier","moneyball","the_dugout"]) },
    { label: "Story Arcs", icon: "📖", ids: new Set(["plot_armour","page_turner","speedrun","trilogy","box_set","completionist","the_gaffer","we_go_again","cold_feet","juiced"]) },
    { label: "Secrets", icon: "🎭", ids: new Set(["mixed_up","enzo_drive","nomin_determ","who_shot_rr","joga_bonito","bayda","old_pace","giant_killing","impossible_job","deja_vu","hand_of_god","salt_wounds","six_seven","its_a_sign","absolute_barclays","forgot_kit","soundtrack","gone_up_one_track","ice_bath_track","training_montage","odds_are_even","the_specialist","binary","impatient"]) },
  ];

  const absNow = (seasonNumber - 1) * seasonLength + calendarIndex;
  const getAbsWeek = (u) => {
    if (!u) return -1;
    if (typeof u === "number") return u; // migration: old format was bare absolute week
    return (u.season - 1) * (u.seasonLen || seasonLength) + u.week;
  };
  const isRecent = (id) => {
    const abs = getAbsWeek(achievementUnlockWeeks[id]);
    if (abs < 0) return false;
    return absNow - abs <= 4;
  };
  const recentIds = new Set(ACHIEVEMENTS.filter(a => unlocked.has(a.id) && isRecent(a.id)).map(a => a.id));
  const hasRecent = recentIds.size > 0;

  React.useEffect(() => {
    if (document.getElementById(achStyleId.current)) return;
    const style = document.createElement("style");
    style.id = achStyleId.current;
    style.textContent = `
      @keyframes legendaryBorderFlow {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      @keyframes legendaryPulse {
        0%, 100% { opacity: 0.03; }
        50% { opacity: 0.08; }
      }
      @keyframes floatSpark {
        0% { opacity: 0; transform: translateY(0) scale(0); }
        15% { opacity: 1; transform: translateY(-4px) scale(1); }
        85% { opacity: 1; transform: translateY(-12px) scale(0.8); }
        100% { opacity: 0; transform: translateY(-16px) scale(0); }
      }

      /* Shared tier card structure */
      .ach-tiered {
        position: relative;
        overflow: hidden;
        border: none !important;
        padding: 0 !important;
      }
      .ach-tiered-border {
        position: absolute;
        inset: -2px;
        background-size: 200% 100%;
        animation: legendaryBorderFlow 3s linear infinite;
        z-index: 0;
        pointer-events: none;
      }
      .ach-tiered-inner {
        position: relative;
        z-index: 1;
        background: rgba(10,10,26,0.95);
        display: flex;
        align-items: center;
        gap: 10px;
        height: 100%;
        overflow: hidden;
      }
      .ach-tiered-inner::before {
        content: '';
        position: absolute;
        inset: 0;
        animation: legendaryPulse 4s ease-in-out infinite;
        pointer-events: none;
      }
      .ach-sparkle {
        position: absolute;
        pointer-events: none;
        z-index: 3;
        font-size: 8px;
        filter: drop-shadow(0 0 2px currentColor);
      }
      .ach-sparkle::before { content: '\\2726'; }
      .ach-sparkle:nth-child(1) { right: 6%; bottom: 15%; animation: floatSpark 2.4s ease-out infinite; }
      .ach-sparkle:nth-child(2) { right: 18%; bottom: 5%; animation: floatSpark 2.8s ease-out infinite 0.5s; }
      .ach-sparkle:nth-child(3) { right: 32%; bottom: 20%; animation: floatSpark 3.0s ease-out infinite 1.0s; }
      .ach-sparkle:nth-child(4) { right: 46%; bottom: 8%; animation: floatSpark 2.6s ease-out infinite 1.5s; }
      .ach-sparkle:nth-child(5) { right: 58%; bottom: 18%; animation: floatSpark 2.9s ease-out infinite 0.3s; }
      .ach-sparkle:nth-child(6) { right: 70%; bottom: 10%; animation: floatSpark 2.5s ease-out infinite 0.8s; }
      .ach-sparkle:nth-child(7) { right: 82%; bottom: 22%; animation: floatSpark 3.1s ease-out infinite 1.3s; }
      .ach-sparkle:nth-child(8) { right: 12%; bottom: 25%; animation: floatSpark 2.7s ease-out infinite 1.8s; }
      .ach-sparkle:nth-child(9) { right: 40%; bottom: 28%; animation: floatSpark 2.3s ease-out infinite 2.1s; }
      .ach-sparkle:nth-child(10) { right: 65%; bottom: 5%; animation: floatSpark 2.8s ease-out infinite 0.6s; }

      /* PRESTIGIOUS — gold */
      .ach-tier-gold .ach-tiered-border {
        background: linear-gradient(90deg, rgba(250,204,21,0.6), rgba(245,158,11,0.2), rgba(251,191,36,0.6), rgba(245,158,11,0.2), rgba(250,204,21,0.6));
        background-size: 200% 100%;
      }
      .ach-tier-gold .ach-tiered-inner::before {
        background: radial-gradient(ellipse at 30% 50%, rgba(250,204,21,0.06) 0%, transparent 70%);
      }
      .ach-tier-gold .ach-sparkle { color: #facc15; }

      /* LEGENDARY — purple */
      .ach-tier-purple .ach-tiered-border {
        background: linear-gradient(90deg, rgba(168,85,247,0.6), rgba(124,58,237,0.2), rgba(192,132,252,0.6), rgba(124,58,237,0.2), rgba(168,85,247,0.6));
        background-size: 200% 100%;
      }
      .ach-tier-purple .ach-tiered-inner::before {
        background: radial-gradient(ellipse at 30% 50%, rgba(168,85,247,0.06) 0%, transparent 70%);
      }
      .ach-tier-purple .ach-sparkle { color: #c084fc; }

      /* PLAYER UNLOCK — green */
      .ach-tier-green .ach-tiered-border {
        background: linear-gradient(90deg, rgba(74,222,128,0.6), rgba(34,197,94,0.2), rgba(134,239,172,0.6), rgba(34,197,94,0.2), rgba(74,222,128,0.6));
        background-size: 200% 100%;
      }
      .ach-tier-green .ach-tiered-inner::before {
        background: radial-gradient(ellipse at 30% 50%, rgba(74,222,128,0.06) 0%, transparent 70%);
      }
      .ach-tier-green .ach-sparkle { color: #4ade80; }
    `;
    document.head.appendChild(style);
    return () => { const el = document.getElementById(achStyleId.current); if (el) el.remove(); };
  }, []);

  // Ticket picker is rendered below the full grid; auto-scroll to keep it visible on mobile.
  useEffect(() => {
    if (!ticketPicker?.type || !ticketPickerPanelRef.current) return;
    const raf = window.requestAnimationFrame(() => {
      ticketPickerPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [ticketPicker?.type, ticketPicker?.showNameInput]);
  return (
    <div style={{ fontFamily: FONT }}>
      {/* Header bar */}
      <div style={{
        marginBottom: 18, padding: "9px 0",
        borderBottom: `2px solid ${C.bgInput}`,
      }}>
        <div style={{ fontSize: mob ? F.xl : F.h2, color: C.gold, letterSpacing: 2 }}>🏪 CORNER SHOP</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "cigs", label: `CIG PACKS`, dot: hasUnseenAchievements },
          { id: "trophies", label: "TOP SHELF" },
          { id: "players", label: "REGULARS" },
          { id: "tickets", label: `SCRATCH CARDS${tickets?.length ? ` (${new Set(tickets.filter(t => TICKET_DEFS[t.type]).map(t => t.type)).size})` : ""}` },
        ].map(t => (
          <button key={t.id} onClick={() => !t.disabled && handleTabChange(t.id)} style={{
            padding: mob ? "10px 13px" : "10px 18px", fontSize: mob ? F.xs : F.sm, letterSpacing: 1,
            background: tab === t.id && !t.disabled ? "rgba(250,204,21,0.1)" : "rgba(15,15,35,0.6)",
            border: tab === t.id && !t.disabled ? `1px solid ${C.gold}` : `1px solid ${C.bgCard}`,
            color: t.disabled ? C.textDim : tab === t.id ? C.gold : C.slate,
            cursor: t.disabled ? "not-allowed" : "pointer", fontFamily: FONT,
            opacity: t.disabled ? 0.45 : 1,
            borderRadius: 20, flex: mob ? "1 1 auto" : undefined, textAlign: "center",
          }}>{t.label}{t.disabled ? " 🔒" : ""}{t.dot ? <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.gold, marginLeft: 6, verticalAlign: "middle", boxShadow: "0 0 6px rgba(250,204,21,0.6)" }} /> : null}</button>
        ))}
      </div>

      {tab === "cigs" && (
        <CigPacksTab
          key={cigsKey}
          unlockedPacks={unlockedPacks}
          unlocked={unlocked}
          achievementUnlockWeeks={achievementUnlockWeeks}
          calendarIndex={calendarIndex}
          seasonNumber={seasonNumber}
          seasonLength={seasonLength}
        />
      )}

      {tab === "trophies" && (
        <div>
          {/* League Titles */}
          <div style={{ fontSize: mob ? F.sm : F.md, color: C.textMuted, letterSpacing: 2, marginBottom: 14 }}>LEAGUE TITLES</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 8, marginBottom: 28,
          }}>
            {ALL_LEAGUES.map(lg => {
              const won = lg.wins > 0;
              const hidden = !lg.visible;
              return (
                <div key={lg.tier} style={{
                  padding: mob ? "18px 10px" : "22px 14px",
                  textAlign: "center",
                  background: hidden ? "rgba(10,10,25,0.5)" : won ? `rgba(${hexToRgb(lg.color)}, 0.08)` : "rgba(15,15,35,0.4)",
                  border: hidden ? "1px solid #0f172a" : won ? `1px solid ${lg.color}55` : `1px solid ${C.bgCard}`,
                  position: "relative",
                }}>
                  <div style={{
                    fontSize: mob ? F.h1 : F.hero, marginBottom: 10,
                    opacity: hidden ? 0.15 : won ? 1 : 0.3,
                    filter: hidden || !won ? "grayscale(1)" : "none",
                  }}>{hidden ? "❓" : lg.icon}</div>
                  <div style={{
                    fontSize: mob ? F.xs : F.sm,
                    color: hidden ? C.bgCard : won ? lg.color : C.bgInput,
                    letterSpacing: 1, lineHeight: 1.5, marginBottom: 4,
                  }}>{hidden ? "???" : lg.shortName}</div>
                  <div style={{
                    fontSize: F.micro,
                    color: hidden ? "#0f172a" : won ? C.textDim : C.bgCard,
                    lineHeight: 1.4,
                  }}>{hidden ? "???" : lg.name}</div>
                  {lg.wins > 1 && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: lg.color, color: "#0a0a1a",
                      fontSize: F.sm, fontWeight: "bold",
                      padding: "3px 8px", borderRadius: 12,
                      fontFamily: FONT,
                    }}>×{lg.wins}</div>
                  )}
                  {lg.wins === 1 && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: `${lg.color}33`, color: lg.color,
                      fontSize: F.xs,
                      padding: "2px 6px", borderRadius: 10,
                      fontFamily: FONT,
                    }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cup Wins */}
          <div style={{ fontSize: mob ? F.sm : F.md, color: C.textMuted, letterSpacing: 2, marginBottom: 14 }}>CUP WINS</div>
          <div style={{
            display: "grid",
            gridTemplateColumns: mob ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 8,
          }}>
            {ALL_CUPS.map(cup => {
              const won = cup.wins > 0;
              const hidden = cup.visible === false;
              return (
                <div key={cup.key} style={{
                  padding: mob ? "18px 10px" : "22px 14px",
                  textAlign: "center",
                  background: hidden ? "rgba(10,10,25,0.5)" : won ? `rgba(${hexToRgb(cup.color)}, 0.08)` : "rgba(15,15,35,0.4)",
                  border: hidden ? "1px solid #0f172a" : won ? `1px solid ${cup.color}55` : `1px solid ${C.bgCard}`,
                  position: "relative",
                }}>
                  <div style={{
                    fontSize: mob ? F.h1 : F.hero, marginBottom: 10,
                    opacity: hidden ? 0.15 : won ? 1 : 0.3,
                    filter: hidden || !won ? "grayscale(1)" : "none",
                  }}>{hidden ? "❓" : cup.icon}</div>
                  <div style={{
                    fontSize: mob ? F.xs : F.sm,
                    color: hidden ? C.bgCard : won ? cup.color : C.bgInput,
                    letterSpacing: 1, lineHeight: 1.5,
                  }}>{hidden ? "???" : cup.name}</div>
                  {cup.wins > 1 && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: cup.color, color: "#0a0a1a",
                      fontSize: F.sm, fontWeight: "bold",
                      padding: "3px 8px", borderRadius: 12,
                      fontFamily: FONT,
                    }}>×{cup.wins}</div>
                  )}
                  {cup.wins === 1 && (
                    <div style={{
                      position: "absolute", top: 8, right: 8,
                      background: `${cup.color}33`, color: cup.color,
                      fontSize: F.xs,
                      padding: "2px 6px", borderRadius: 10,
                      fontFamily: FONT,
                    }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "achievements" && (
        <>
          {/* Progress bar */}
          <div style={{ marginBottom: 18, background: C.bgCard, height: 8, border: `1px solid ${C.bgInput}` }}>
            <div style={{
              height: "100%", width: `${(unlocked.size / ACHIEVEMENTS.length) * 100}%`,
              background: "linear-gradient(90deg, #facc15, #f59e0b)",
              transition: "width 0.5s ease",
            }} />
          </div>

          {/* Category filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: filterCat ? 12 : 18 }}>
            {hasRecent && (
              <div onClick={() => setFilterCat(filterCat === "Recent" ? null : "Recent")} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 12px", cursor: "pointer",
                background: filterCat === "Recent" ? "rgba(250,204,21,0.15)" : "rgba(250,204,21,0.08)",
                border: `1px solid ${filterCat === "Recent" ? "rgba(250,204,21,0.6)" : "rgba(250,204,21,0.3)"}`,
                outline: filterCat === "Recent" ? "1px solid rgba(250,204,21,0.2)" : "none",
                outlineOffset: 2,
              }}>
                <span style={{ fontSize: F.lg }}>🆕</span>
                <span style={{ fontSize: F.xs, color: filterCat === "Recent" ? C.gold : C.text, letterSpacing: 0.5 }}>RECENT</span>
                <span style={{ fontSize: F.xs, color: C.gold, fontWeight: "bold" }}>{recentIds.size}</span>
              </div>
            )}
            {ACH_CATS.map(cat => {
              const total = ACHIEVEMENTS.filter(a => cat.ids.has(a.id)).length;
              const done = ACHIEVEMENTS.filter(a => cat.ids.has(a.id) && unlocked.has(a.id)).length;
              const complete = done === total && total > 0;
              const active = filterCat === cat.label;
              return (
                <div key={cat.label} onClick={() => setFilterCat(active ? null : cat.label)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", cursor: "pointer",
                  background: active ? "rgba(250,204,21,0.15)" : done > 0 ? "rgba(250,204,21,0.05)" : "rgba(15,15,35,0.5)",
                  border: `1px solid ${active ? "rgba(250,204,21,0.6)" : complete ? "rgba(74,222,128,0.3)" : done > 0 ? "rgba(250,204,21,0.2)" : C.bgCard}`,
                  outline: active ? "1px solid rgba(250,204,21,0.2)" : "none",
                  outlineOffset: 2,
                }}>
                  <span style={{ fontSize: F.lg }}>{cat.icon}</span>
                  <span style={{ fontSize: F.xs, color: active ? C.gold : done > 0 ? C.textDim : C.bgInput, letterSpacing: 0.5 }}>{cat.label.toUpperCase()}</span>
                  <span style={{ fontSize: F.xs, color: complete ? C.green : done > 0 ? C.gold : C.bgInput, fontWeight: "bold" }}>{done}/{total}</span>
                </div>
              );
            })}
          </div>
          {filterCat && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: F.xs, color: C.textDim, letterSpacing: 1 }}>
                SHOWING: <span style={{ color: C.gold }}>{filterCat.toUpperCase()}</span>
              </span>
              <button onClick={() => setFilterCat(null)} style={{
                background: "none", border: `1px solid ${C.bgInput}`, color: C.slate,
                padding: "5px 12px", fontSize: F.xs, cursor: "pointer",
                fontFamily: FONT, letterSpacing: 0.5,
              }}>✕ SHOW ALL</button>
            </div>
          )}

          {/* Achievement grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(253px, 1fr))", gap: 7 }}>
            {ACHIEVEMENTS.filter(a => !filterCat || (filterCat === "Recent" ? recentIds.has(a.id) : ACH_CATS.find(c => c.label === filterCat)?.ids.has(a.id))).sort((a, b) => {
              if (filterCat !== "Recent") return 0;
              return getAbsWeek(achievementUnlockWeeks[b.id]) - getAbsWeek(achievementUnlockWeeks[a.id]);
            }).map((ach, achIdx) => {
              const ok = unlocked.has(ach.id);
              const isLegendary = ok && LEGENDARY_ACHIEVEMENTS.has(ach.id);
              const isPlayerUnlock = ok && PLAYER_UNLOCK_ACHIEVEMENTS.has(ach.id);
              const isPrestigious = ok && !isPlayerUnlock && PRESTIGIOUS_ACHIEVEMENTS.has(ach.id);
              const isTiered = isLegendary || isPrestigious || isPlayerUnlock;

              const tierColor = isLegendary ? "purple" : isPlayerUnlock ? "green" : "gold";
              const nameColor = isLegendary ? C.purple : isPlayerUnlock ? C.green : C.gold;
              const descColor = isLegendary ? "#9366c9" : isPlayerUnlock ? "#34d399" : "#d4a017";
              const iconBg = isLegendary ? "rgba(168,85,247,0.15)" : isPlayerUnlock ? "rgba(74,222,128,0.15)" : "rgba(250,204,21,0.15)";
              const iconBorder = isLegendary ? "rgba(168,85,247,0.4)" : isPlayerUnlock ? "rgba(74,222,128,0.4)" : "rgba(250,204,21,0.4)";

              if (isTiered) {
                return (
                  <div key={ach.id} className={`ach-tiered ach-tier-${tierColor}`} style={{
                    padding: 0, position: "relative", minHeight: 48,
                  }}>
                    <div className="ach-tiered-border" />
                    <div className="ach-tiered-inner" style={{ padding: "15px 18px" }}>
                      <div style={{
                        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: F.xl, background: iconBg, border: `1px solid ${iconBorder}`, flexShrink: 0,
                      }}>
                        {ach.icon}
                      </div>
                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <div style={{ fontSize: F.sm, color: nameColor, lineHeight: 1.5 }}>{ach.name}</div>
                        <div style={{ fontSize: F.xs, color: descColor, marginTop: 2, lineHeight: 1.5 }}>{ach.desc}</div>
                      </div>
                      <span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" /><span className="ach-sparkle" />
                    </div>
                  </div>
                );
              }

              return (
                <div key={ach.id} style={{
                  padding: "15px 18px",
                  background: ok ? "rgba(250,204,21,0.06)" : "rgba(15,15,35,0.6)",
                  border: ok ? "1px solid rgba(250,204,21,0.25)" : `1px solid ${C.bgCard}`,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: ok ? F.xl : F.lg,
                    background: ok ? "rgba(250,204,21,0.1)" : "rgba(30,41,59,0.5)",
                    border: ok ? "1px solid rgba(250,204,21,0.3)" : `1px solid ${C.bgCard}`,
                    flexShrink: 0,
                  }}>
                    {ok ? ach.icon : "?"}
                  </div>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div style={{ fontSize: F.sm, color: ok ? C.text : C.slate, lineHeight: 1.5 }}>
                      {ach.name}
                    </div>
                    <div style={{ fontSize: F.xs, color: ok ? C.textMuted : C.bgCard, marginTop: 2, lineHeight: 1.5 }}>
                      {ok ? ach.desc : "Locked"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "players" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {UNLOCKABLE_PLAYERS.map(up => {
            const isAchievementUnlock = up.achievementId && unlocked.has(up.achievementId);
            const squadPlayer = squad && squad.find(p => p.id === `unlockable_${up.id}`);
            const isInSquad = !!squadPlayer;
            const isUnlocked = isAchievementUnlock || isInSquad;
            // Show current squad attrs if available (prestige-scaled + training gains), else definition attrs
            const displayAttrs = squadPlayer ? squadPlayer.attrs : up.attrs;
            const displayCap = squadPlayer?.isLegend ? squadPlayer.legendCap
              : squadPlayer?.isUnlockable && squadPlayer.legendCap ? squadPlayer.legendCap
              : ovrCap;
            const hasAch = up.achievementId !== null;
            const isSecret = up.secret;
            const linkedAch = up.achievementId ? ACHIEVEMENTS.find(a => a.id === up.achievementId) : null;

            // Secret unlockables are completely hidden until discovered
            if (isSecret && !isUnlocked) return null;
            return (
              <div key={up.id} style={{
                padding: "23px 26px",
                background: isUnlocked
                  ? "linear-gradient(135deg, rgba(74,222,128,0.08) 0%, rgba(74,222,128,0.02) 100%)"
                  : "rgba(15,15,35,0.6)",
                border: isUnlocked ? "1px solid rgba(74,222,128,0.3)" : `1px solid ${C.bgCard}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      padding: "5px 10px", fontSize: F.sm, letterSpacing: 1,
                      background: isUnlocked ? "#166534" : C.bgCard,
                      color: isUnlocked ? C.green : C.bgInput,
                      border: isUnlocked ? `1px solid ${C.green}` : `1px solid ${C.bgInput}`,
                    }}>{isUnlocked ? up.position : "??"}</span>
                    <span style={{ fontSize: F.xl, color: isUnlocked ? C.text : hasAch ? C.slate : C.bgCard }}>
                      {isUnlocked ? up.name : "???"}
                    </span>
                    {isUnlocked && <span style={{ fontSize: F.sm, color: C.textDim }}>Age {up.age}</span>}
                  </div>
                  {isInSquad && <span style={{ fontSize: F.sm, color: C.green }}>✓ IN SQUAD</span>}
                  {!isUnlocked && !hasAch && !isSecret && <span style={{ fontSize: F.xs, color: C.bgCard }}>COMING SOON</span>}
                </div>
                {isUnlocked && displayAttrs && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {ATTRIBUTES.map(a => (
                      <div key={a.key} style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: F.xs, color: C.textDim, letterSpacing: 1, marginBottom: 3 }}>{a.label}</div>
                        <div style={{
                          fontSize: F.xl, fontWeight: "bold",
                          color: getAttrColor(displayAttrs[a.key], displayCap),
                        }}>{displayAttrs[a.key]}</div>
                      </div>
                    ))}
                  </div>
                )}
                {!isUnlocked && hasAch && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    {ATTRIBUTES.map(a => (
                      <div key={a.key} style={{ textAlign: "center", flex: 1 }}>
                        <div style={{ fontSize: F.xs, color: C.bgCard, letterSpacing: 1, marginBottom: 3 }}>{a.label}</div>
                        <div style={{ fontSize: F.xl, color: C.bgCard }}>?</div>
                      </div>
                    ))}
                  </div>
                )}
                {isUnlocked ? (
                  <div style={{ fontSize: F.xs, color: C.textDim, fontStyle: "italic" }}>{up.flavour}</div>
                ) : linkedAch ? (
                  <div style={{ fontSize: F.xs, color: C.slate }}>🔒 {linkedAch.desc}</div>
                ) : (
                  <div style={{ fontSize: F.xs, color: C.bgCard }}>🔒 ???</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TICKETS TAB */}
      {tab === "tickets" && (
        <div>
          <div style={{ fontSize: F.xs, color: C.gold, letterSpacing: 2, marginBottom: 12 }}>🎟️ CONSUMABLE TICKETS</div>
          {(!tickets || tickets.length === 0) ? (
            <div style={{ fontSize: F.xs, color: C.slate, padding: 16, textAlign: "center", lineHeight: 2 }}>
              No tickets. Earn more through Story Arcs and Achievements.
            </div>
          ) : (() => {
            const grouped = {};
            tickets.forEach(t => {
              if (!grouped[t.type]) grouped[t.type] = [];
              grouped[t.type].push(t);
            });

            const entries = Object.entries(grouped);
            const activeType = ticketPicker?.type;
            const activeDef = activeType ? TICKET_DEFS[activeType] : null;

            // Compute disable state for each ticket type
            const ticketState = {};
            entries.forEach(([type, typeTickets]) => {
              const def = TICKET_DEFS[type];
              if (!def) return;
              let canUse = true;
              let disabledReason = null;
              if (type === "delay_retirement") {
                if (!squad?.some(p => retiringPlayers?.has(p.id))) { canUse = false; disabledReason = "No retiring players"; }
              } else if (type === "random_attr") {
                if (!squad?.some(p => ATTRIBUTES.some(a => p.attrs[a.key] < 20))) { canUse = false; disabledReason = "All players maxed"; }
              } else if (type === "relation_boost") {
                if (!transferFocus?.length) { canUse = false; disabledReason = "No focused clubs"; }
              } else if (type === "double_session") {
                if (doubleTrainingWeek) { canUse = false; disabledReason = "Already active"; }
              } else if (type === "miracle_cream") {
                if (!squad?.some(p => p.injury)) { canUse = false; disabledReason = "No injured players"; }
              } else if (type === "twelfth_man") {
                if (twelfthManActive) { canUse = false; disabledReason = "Already active"; }
              } else if (type === "youth_coup") {
                if (youthCoupActive) { canUse = false; disabledReason = "Already active"; }
              } else if (type === "transfer_insider") {
                if (pendingFreeAgent) { canUse = false; disabledReason = "Pending offer active"; }
              } else if (type === "scout_dossier") {
                const unscouted = shortlist?.filter(p => !scoutedPlayers?.[p.id]);
                if (!unscouted?.length) { canUse = false; disabledReason = shortlist?.length ? "All shortlisted scouted" : "Shortlist empty"; }
              } else if (type === "testimonial_match") {
                const hasRetiredData = Object.values(clubHistory?.playerCareers || {}).some(c => c.retiredAttrs);
                if (!hasRetiredData) { canUse = false; disabledReason = "No retired players"; }
                else if (testimonialPlayer) { canUse = false; disabledReason = "Testimonial in progress"; }
              }
              ticketState[type] = { canUse, disabledReason, count: typeTickets.length, firstTicket: typeTickets[0], def };
            });

            return (
              <>
                {/* Ticket grid */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {entries.map(([type, typeTickets]) => {
                    const s = ticketState[type];
                    if (!s) return null;
                    const { canUse, disabledReason, count, firstTicket, def } = s;
                    const isPicking = activeType === type;
                    const needsPicker = ["retiring_player", "any_player", "injured_player", "shortlisted_player", "retired_player", "lost_match"].includes(def.target);
                    const tW = mob ? "100%" : 340; // ticket width

                    // Background layers — shine position shifts on hover
                    const mkBg = (shineOffset) => [
                      // Edge cutouts
                      `radial-gradient(circle at 0 50%, ${C.bg} 13px, transparent 13.5px)`,
                      `radial-gradient(circle at 100% 50%, ${C.bg} 13px, transparent 13.5px)`,
                      // Glossy shine band (shifts on hover)
                      `linear-gradient(105deg, transparent ${shineOffset}%, rgba(255,255,255,0.04) ${shineOffset + 5}%, rgba(255,255,255,0.10) ${shineOffset + 12}%, rgba(255,255,255,0.04) ${shineOffset + 19}%, transparent ${shineOffset + 24}%)`,
                      // Top highlight
                      `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 40%, transparent 70%)`,
                      // Linen micro-texture
                      `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)`,
                      `repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)`,
                      // Base — lifted card stock with color tint
                      `linear-gradient(135deg, ${def.color}22 0%, #172040 30%, #1c1e50 65%, ${def.color}12 100%)`,
                    ].join(", ");

                    return (
                      <div
                        key={type}
                        onClick={() => {
                          if (!canUse) return;
                          if (needsPicker) {
                            setTicketPicker(isPicking ? null : { ticketId: firstTicket.id, type });
                          } else {
                            onUseTicket?.[type]?.(firstTicket.id);
                            setTicketPicker(null);
                          }
                        }}
                        onMouseEnter={e => {
                          if (!canUse) return;
                          e.currentTarget.style.background = mkBg(50);
                          e.currentTarget.style.boxShadow = `0 0 0 1px ${def.color}66, 0 0 16px ${def.color}25, 0 6px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 ${def.color}15`;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = mkBg(30);
                          e.currentTarget.style.boxShadow = isPicking
                            ? `0 0 0 2px ${def.color}, 0 0 20px ${def.color}20, 0 6px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 ${def.color}15`
                            : `0 0 0 1px ${def.color}30, 0 3px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 ${def.color}10`;
                        }}
                        style={{
                          width: tW,
                          height: mob ? 100 : 110,
                          display: "flex",
                          alignItems: "stretch",
                          borderRadius: 12,
                          position: "relative",
                          background: mkBg(30),
                          boxShadow: isPicking
                            ? `0 0 0 2px ${def.color}, 0 0 20px ${def.color}20, 0 6px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 ${def.color}15`
                            : `0 0 0 1px ${def.color}30, 0 3px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 ${def.color}10`,
                          opacity: !canUse ? 0.45 : 1,
                          cursor: canUse ? "pointer" : "default",
                          transition: "box-shadow 0.3s, opacity 0.2s",
                        }}
                      >
                        {/* Main body */}
                        <div style={{
                          flex: 1,
                          padding: mob ? "14px 4px 14px 26px" : "16px 6px 16px 28px",
                          display: "flex", alignItems: "center", gap: 12,
                          minWidth: 0,
                        }}>
                          <div style={{ fontSize: mob ? F.h2 : F.h1, flexShrink: 0 }}>{def.icon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <span style={{
                                fontSize: mob ? F.xs : F.sm, color: def.color, letterSpacing: 0.5,
                              }}>{def.name}</span>
                              {count > 1 && (
                                <span style={{
                                  fontSize: F.micro, fontFamily: FONT,
                                  background: def.color, color: C.bg,
                                  borderRadius: 6, padding: "1px 5px", lineHeight: 1.4, flexShrink: 0,
                                }}>x{count}</span>
                              )}
                            </div>
                            <div style={{
                              fontSize: F.micro, color: disabledReason ? C.slate : C.textDim,
                              lineHeight: 1.7,
                              fontStyle: disabledReason ? "italic" : "normal",
                              display: "-webkit-box", WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical", overflow: "hidden",
                            }}>{disabledReason || def.desc}</div>
                          </div>
                        </div>
                        {/* Perforation column */}
                        <div style={{
                          width: 16, flexShrink: 0,
                          background: `radial-gradient(circle, ${def.color}30 2px, transparent 2.5px) center / 16px 10px repeat-y`,
                        }} />
                        {/* Redeem stub */}
                        <div style={{
                          width: mob ? 52 : 62,
                          flexShrink: 0,
                          display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center",
                          paddingRight: mob ? 10 : 14,
                          background: isPicking
                            ? `linear-gradient(135deg, ${C.red}18, ${C.red}08)`
                            : canUse
                              ? `linear-gradient(135deg, ${def.color}12, transparent)`
                              : "transparent",
                        }}>
                          <span style={{
                            fontSize: F.xs, fontFamily: FONT,
                            color: isPicking ? C.red : canUse ? def.color : C.textDim,
                            letterSpacing: 1,
                          }}>{isPicking ? "X" : "USE"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Picker panel — renders below the grid when a picker-type ticket is active */}
                {activeType && activeDef && (() => {
                  const isPicking = true;
                  const type = activeType;
                  const def = activeDef;

                  return (
                    <div ref={ticketPickerPanelRef} style={{
                      marginTop: 14,
                      background: "rgba(15,23,42,0.95)",
                      border: `1px solid ${def.color}44`,
                      borderRadius: 8,
                      overflow: "hidden",
                    }}>
                      {/* Rename player: name input step */}
                      {ticketPicker?.showNameInput && (
                        <div style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: F.xs, color: C.textDim, marginBottom: 8 }}>
                            ENTER NEW SHIRT NAME FOR {squad?.find(p => p.id === ticketPicker.selectedPlayerId)?.name?.toUpperCase()}:
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="text"
                              maxLength={20}
                              placeholder="New name..."
                              value={ticketPicker.nameInput || ""}
                              onChange={e => setTicketPicker(prev => ({ ...prev, nameInput: e.target.value }))}
                              style={{
                                flex: 1, padding: "8px 12px", fontSize: F.xs,
                                fontFamily: FONT,
                                background: "#0f172a", border: `1px solid ${C.bgInput}`,
                                color: C.text, outline: "none",
                              }}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === "Enter" && ticketPicker.nameInput?.trim()) {
                                  onUseTicket?.rename_player(ticketPicker.ticketId, ticketPicker.selectedPlayerId, ticketPicker.nameInput);
                                  setTicketPicker(null);
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                if (ticketPicker.nameInput?.trim()) {
                                  onUseTicket?.rename_player(ticketPicker.ticketId, ticketPicker.selectedPlayerId, ticketPicker.nameInput);
                                  setTicketPicker(null);
                                }
                              }}
                              style={{
                                padding: "8px 14px", fontSize: F.xs,
                                fontFamily: FONT,
                                background: ticketPicker.nameInput?.trim() ? "rgba(74,222,128,0.1)" : "rgba(30,41,59,0.5)",
                                border: ticketPicker.nameInput?.trim() ? `1px solid ${C.green}` : `1px solid ${C.bgCard}`,
                                color: ticketPicker.nameInput?.trim() ? C.green : C.bgInput,
                                cursor: ticketPicker.nameInput?.trim() ? "pointer" : "default",
                              }}
                            >CONFIRM</button>
                          </div>
                        </div>
                      )}

                      {/* Squad picker (retiring, any, injured, rename first step) */}
                      {!ticketPicker?.showNameInput && ["retiring_player", "any_player", "injured_player"].includes(def.target) && (
                        <div style={{ padding: "8px 0", maxHeight: 240, overflowY: "auto" }}>
                          <div style={{ fontSize: F.xs, color: def.color, padding: "6px 16px", letterSpacing: 1, marginBottom: 4 }}>
                            {type === "delay_retirement" ? "SELECT RETIRING PLAYER:" :
                             type === "miracle_cream" ? "SELECT INJURED PLAYER:" : "SELECT PLAYER:"}
                          </div>
                          {(squad || [])
                            .filter(p => {
                              if (type === "delay_retirement") return retiringPlayers?.has(p.id);
                              if (type === "miracle_cream") return !!p.injury;
                              if (type === "random_attr") return ATTRIBUTES.some(a => p.attrs[a.key] < 20);
                              return true;
                            })
                            .sort((a, b) => getOverall(b) - getOverall(a))
                            .map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  if (type === "rename_player") {
                                    setTicketPicker(prev => ({ ...prev, selectedPlayerId: p.id, showNameInput: true, nameInput: "" }));
                                    return;
                                  }
                                  onUseTicket?.[type]?.(ticketPicker.ticketId, p.id);
                                  setTicketPicker(null);
                                }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "10px 16px", cursor: "pointer",
                                  borderBottom: "1px solid #0f172a",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(74,222,128,0.06)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              >
                                <span style={{
                                  fontSize: F.xs, fontFamily: FONT,
                                  background: getPosColor(p.position), color: C.bg,
                                  padding: "2px 6px", fontWeight: "bold", flexShrink: 0,
                                }}>{p.position}</span>
                                <span style={{ fontSize: mob ? F.xs : F.sm, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {displayName(p.name, mob)}
                                </span>
                                <span style={{ fontSize: F.xs, color: C.textMuted, flexShrink: 0 }}>
                                  OVR {getOverall(p)}
                                </span>
                                {p.injury && (
                                  <span style={{ fontSize: F.xs, color: "#ef444488", flexShrink: 0 }}>INJ</span>
                                )}
                                {retiringPlayers?.has(p.id) && (
                                  <span style={{ fontSize: F.xs, color: "#ef444488", flexShrink: 0 }}>RET</span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Shortlist picker (scout dossier) */}
                      {def.target === "shortlisted_player" && (
                        <div style={{ padding: "8px 0", maxHeight: 240, overflowY: "auto" }}>
                          <div style={{ fontSize: F.xs, color: def.color, padding: "6px 16px", letterSpacing: 1, marginBottom: 4 }}>
                            SELECT SHORTLISTED PLAYER:
                          </div>
                          {(shortlist || [])
                            .filter(p => !scoutedPlayers?.[p.id])
                            .map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  onUseTicket?.scout_dossier(ticketPicker.ticketId, p.id);
                                  setTicketPicker(null);
                                }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "10px 16px", cursor: "pointer",
                                  borderBottom: "1px solid #0f172a",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(74,222,128,0.06)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              >
                                <span style={{
                                  fontSize: F.xs, fontFamily: FONT,
                                  background: getPosColor(p.position), color: C.bg,
                                  padding: "2px 6px", fontWeight: "bold", flexShrink: 0,
                                }}>{p.position}</span>
                                <span style={{ fontSize: mob ? F.xs : F.sm, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {displayName(p.name, mob)}
                                </span>
                                <span style={{ fontSize: F.xs, color: C.textMuted, flexShrink: 0 }}>
                                  OVR {getOverall(p)}
                                </span>
                                <span style={{ fontSize: F.xs, color: C.textMuted, flexShrink: 0 }}>
                                  Age {p.age}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Retired player picker (testimonial match) */}
                      {def.target === "retired_player" && (
                        <div style={{ padding: "8px 0", maxHeight: 240, overflowY: "auto" }}>
                          <div style={{ fontSize: F.xs, color: def.color, padding: "6px 16px", letterSpacing: 1, marginBottom: 4 }}>
                            SELECT RETIRED LEGEND:
                          </div>
                          {Object.entries(clubHistory?.playerCareers || {})
                            .filter(([, c]) => c.retiredAttrs)
                            .sort((a, b) => (b[1].apps || 0) - (a[1].apps || 0))
                            .map(([name, career]) => (
                              <div
                                key={name}
                                onClick={() => {
                                  onUseTicket?.testimonial_match(ticketPicker.ticketId, name);
                                  setTicketPicker(null);
                                }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "10px 16px", cursor: "pointer",
                                  borderBottom: "1px solid #0f172a",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = "rgba(74,222,128,0.06)"; }}
                                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                              >
                                <span style={{
                                  fontSize: F.xs, fontFamily: FONT,
                                  background: getPosColor(career.retiredPosition), color: C.bg,
                                  padding: "2px 6px", fontWeight: "bold", flexShrink: 0,
                                }}>{career.retiredPosition}</span>
                                <span style={{ fontSize: mob ? F.xs : F.sm, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {name}
                                </span>
                                <span style={{ fontSize: F.xs, color: C.textMuted, flexShrink: 0 }}>
                                  {career.apps || 0} apps
                                </span>
                                <span style={{ fontSize: F.xs, color: C.textMuted, flexShrink: 0 }}>
                                  {career.goals || 0} goals
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Match picker (rewind ticket) */}
                      {def.target === "lost_match" && (
                        <div style={{ padding: "8px 0", maxHeight: 280, overflowY: "auto" }}>
                          <div style={{ fontSize: F.xs, color: def.color, padding: "6px 16px", letterSpacing: 1, marginBottom: 4 }}>
                            SELECT MATCH TO REPLAY:
                          </div>
                          {(rewindableMatches || []).length === 0 && (
                            <div style={{ padding: "12px 16px", fontSize: F.xs, color: C.textDim }}>
                              No losses or draws to replay yet.
                            </div>
                          )}
                          {(rewindableMatches || []).map(m => (
                            <div
                              key={m.calIdx}
                              onClick={() => {
                                onUseTicket?.rewind(ticketPicker.ticketId, m.calIdx);
                                setTicketPicker(null);
                              }}
                              style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "10px 16px", cursor: "pointer",
                                borderBottom: "1px solid #0f172a",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(74,222,128,0.06)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                            >
                              <span style={{
                                fontSize: F.xs, fontFamily: FONT,
                                background: m.isDraw ? "#facc1533" : "#ef444433",
                                color: m.isDraw ? "#facc15" : "#ef4444",
                                padding: "2px 8px", flexShrink: 0,
                              }}>{m.isDraw ? "D" : "L"}</span>
                              <span style={{ fontSize: F.micro, color: C.textDim, flexShrink: 0, minWidth: 40 }}>
                                MD {m.md}
                              </span>
                              <span style={{ fontSize: mob ? F.xs : F.sm, color: C.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {m.oppName} ({m.isHome ? "H" : "A"})
                              </span>
                              <span style={{ fontSize: F.xs, color: m.isDraw ? "#facc15" : "#ef4444", flexShrink: 0 }}>
                                {m.playerGoals}-{m.oppGoals}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Gain notification component
// PixelDissolveCard → src/components/ui/PixelDissolveCard.jsx

// AnimatedPips → src/components/ui/AnimatedPips.jsx
// Animated pip bar for level-up cards: shows old pips → fills to 5/5 → turns green/gold
// LevelUpPips → src/components/ui/LevelUpPips.jsx

// ==================== OVR LEVEL-UP CELEBRATION ====================

// OvrLevelUpCelebration → src/components/ui/OvrLevelUpCelebration.jsx

// GainPopup → src/components/gains/GainPopup.jsx
// Generic mystery card — click to pixel-dissolve and reveal any content type
// MysteryCard → src/components/gains/MysteryCard.jsx
// Mini sparkline chart for attribute progression
// Sparkline → src/components/charts/Sparkline.jsx

// Player detail / training assignment panel
