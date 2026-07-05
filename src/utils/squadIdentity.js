import { POSITION_TYPES } from "../data/positions.js";

// Pure derivation of a squad's training "identity" from its outfield
// players' training assignments and attributes. No app wiring — this module
// only decides whether a distinct archetype exists, not when/how it's shown.
//
// A squad qualifies for an archetype when EITHER:
//   - 50%+ of outfield (non-GK, non-trial) players are trained on the
//     archetype's aligned focus family, OR
//   - the archetype's positional attribute average for its associated
//     position group is clearly ahead of the squad-wide average for that
//     same attribute (>= CLEAR_LEAD_RATIO).
//
// Most squads, most of the time, are a mix of training foci with no
// standout group — classifySquadIdentity returns null far more often than
// not. That's intentional: the identity headline is meant to feel earned,
// not routine.

const OUTFIELD_FOCUS_SHARE_THRESHOLD = 0.5;
const CLEAR_LEAD_RATIO = 1.15; // group average must be 15%+ above squad average

const ARCHETYPES = [
  {
    id: "counter-attacking",
    focusKeys: ["pace"],
    attrKey: "pace",
    attrGroup: "FWD",
  },
  {
    id: "defensive-wall",
    focusKeys: ["defending"],
    attrKey: "defending",
    attrGroup: "DEF",
  },
  {
    id: "possession",
    focusKeys: ["passing", "technique"],
    attrKey: "passing",
    attrGroup: "MID",
  },
];

function isEligibleOutfielder(player) {
  return !player.isTrial && POSITION_TYPES[player.position] !== "GK";
}

function attrAverage(players, attrKey) {
  if (players.length === 0) return 0;
  return players.reduce((sum, p) => sum + (p.attrs?.[attrKey] || 0), 0) / players.length;
}

// Returns the archetype id string ("counter-attacking" | "defensive-wall" |
// "possession") when the squad's training has produced a clear, distinct
// identity, or null when nothing stands out.
export function classifySquadIdentity(squad) {
  if (!Array.isArray(squad) || squad.length === 0) return null;

  const outfield = squad.filter(isEligibleOutfielder);
  if (outfield.length === 0) return null;

  const candidates = ARCHETYPES.map((archetype) => {
    const onFocus = outfield.filter((p) => archetype.focusKeys.includes(p.training));
    const focusShare = onFocus.length / outfield.length;

    const groupPlayers = outfield.filter((p) => POSITION_TYPES[p.position] === archetype.attrGroup);
    const groupAvg = attrAverage(groupPlayers, archetype.attrKey);
    const squadAvg = attrAverage(outfield, archetype.attrKey);
    const isLeadingAttr = squadAvg > 0 && groupPlayers.length > 0 && groupAvg >= squadAvg * CLEAR_LEAD_RATIO;

    return { archetype, focusShare, groupAvg, squadAvg, isLeadingAttr };
  });

  const qualifying = candidates.filter(
    (c) => c.focusShare >= OUTFIELD_FOCUS_SHARE_THRESHOLD || c.isLeadingAttr
  );
  if (qualifying.length === 0) return null;

  // Strongest training-focus share wins; ties (or attr-only qualifiers)
  // broken by how far ahead the positional attribute average is.
  qualifying.sort((a, b) => {
    if (b.focusShare !== a.focusShare) return b.focusShare - a.focusShare;
    return (b.groupAvg - b.squadAvg) - (a.groupAvg - a.squadAvg);
  });

  return qualifying[0].archetype.id;
}
