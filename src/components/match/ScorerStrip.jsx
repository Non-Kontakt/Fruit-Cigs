import React, { useMemo } from "react";
import { F, C, FONT } from "../../data/tokens";
import { groupGoalsByScorer, buildScorerDisplayMap, formatScorerName } from "../../utils/matchEvents.js";

/**
 * Persistent scorer/assister strip rendered under the matchday scoreline.
 *
 * Pure derived view of goal events — no own state. Home column left,
 * away column right. Empty state returns null (no placeholder).
 *
 * Driven by `shownEvents` (the live-filtered event stream), so it updates
 * in step with the commentary box in slow/fast/highlights modes and is
 * fully populated on arrival for instant matches.
 *
 * Goals are grouped by scorer so a brace becomes one row instead of two.
 * Mobile drops assists; desktop stacks the assister(s) on a sub-line
 * beneath the scorer to avoid the line being truncated when the column
 * is narrow.
 */
export function ScorerStrip({
  events,
  homeSquad = null,
  awaySquad = null,
  isMobile = false,
}) {
  const { home, away } = useMemo(() => groupGoalsByScorer(events), [events]);

  // Mobile-only — disambiguated surname map across the combined match squads.
  const displayMap = useMemo(() => {
    if (!isMobile) return null;
    const pool = [];
    if (Array.isArray(homeSquad)) pool.push(...homeSquad);
    if (Array.isArray(awaySquad)) pool.push(...awaySquad);
    return buildScorerDisplayMap(events, pool);
  }, [isMobile, events, homeSquad, awaySquad]);

  if (home.length === 0 && away.length === 0) return null;

  // === Mobile compact ledger ("28', 31' Watkins" — no assists) ===
  if (isMobile) {
    const minutesStr = (entry) => entry.goals
      .map(g => g.minute != null ? `${g.minute}'` : "")
      .filter(Boolean)
      .join(", ");
    const renderEntry = (entry, key, alignRight) => {
      const name = displayMap?.[entry.player] ?? formatScorerName(entry.player);
      const mins = minutesStr(entry);
      return (
        <div key={key} style={{
          fontSize: F.xs, lineHeight: 1.6, color: C.textMuted,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textAlign: alignRight ? "right" : "left",
        }}>
          {alignRight ? (
            <>
              <span>{name}</span>
              {mins && <span style={{ color: C.textDim, marginLeft: 4 }}>{mins}</span>}
            </>
          ) : (
            <>
              {mins && <span style={{ color: C.textDim, marginRight: 4 }}>{mins}</span>}
              <span>{name}</span>
            </>
          )}
        </div>
      );
    };
    return (
      <div style={{
        display: "flex", gap: 10,
        marginTop: 10, marginBottom: 12,
        padding: "0 4px",
        flexShrink: 0,
        fontFamily: FONT,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {home.map((entry, i) => renderEntry(entry, `h-${i}`, false))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {away.map((entry, i) => renderEntry(entry, `a-${i}`, true))}
        </div>
      </div>
    );
  }

  // === Desktop ===
  // Scorer + minutes on the first line; if any of the goals had an
  // assister, render a sub-line beneath listing them. Stacking keeps the
  // line short enough that it doesn't get truncated when the column is
  // narrow.
  const renderEntry = (entry, key, alignRight) => {
    const minuteParts = entry.goals
      .map(g => g.minute != null ? `${g.minute}'` : "")
      .filter(Boolean);
    const assistedGoals = entry.goals.filter(g => g.assister);
    let assistLine = null;
    if (assistedGoals.length > 0) {
      // For multi-goal entries, prefix each assister with its minute so the
      // user can match assist → goal. For single-goal entries the prefix is
      // redundant, so just render the bare name.
      const parts = assistedGoals.map(g =>
        entry.goals.length > 1
          ? `${g.minute}' ${formatScorerName(g.assister)}`
          : formatScorerName(g.assister)
      );
      assistLine = `(${parts.join(", ")})`;
    }
    return (
      <div key={key} style={{
        fontSize: F.sm, lineHeight: 1.5, color: C.textMuted,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        textAlign: alignRight ? "right" : "left",
      }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span>{formatScorerName(entry.player)}</span>
          {minuteParts.length > 0 && (
            <span style={{ color: C.textDim, marginLeft: 4 }}>{minuteParts.join(", ")}</span>
          )}
        </div>
        {assistLine && (
          <div style={{
            fontSize: F.xs, color: C.textDim,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {assistLine}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: "flex", gap: 16,
      marginTop: 14, marginBottom: 16,
      padding: "0 6px",
      flexShrink: 0,
      fontFamily: FONT,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {home.map((entry, i) => renderEntry(entry, `h-${i}`, false))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {away.map((entry, i) => renderEntry(entry, `a-${i}`, true))}
      </div>
    </div>
  );
}
