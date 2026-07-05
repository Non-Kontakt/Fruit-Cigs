import { POSITION_TYPES } from "../data/positions.js";

// Pure derivation of a squad's training "identity" from its outfield
// players' training assignments. No app wiring — this module only decides
// whether a distinct archetype exists, not when/how it's shown.
//
// A squad qualifies for an archetype iff 50%+ of its non-trial outfield
// (non-GK) players are trained on that archetype's single-attribute focus
// family: pace -> counter-attacking, defending -> defensive-wall,
// passing OR technique -> possession. The families are disjoint, so at
// most one archetype can clear the bar for a given squad.
//
// Most squads, most of the time, are a mix of training foci with no
// group over the bar — classifySquadIdentity returns null far more often
// than not. That's intentional: the identity headline is meant to feel
// earned, not routine. Positional attribute averages are NOT part of the
// qualifying condition — defenders naturally lead defending and forwards
// naturally lead pace regardless of training, so an attribute-average
// route would fire on ordinary positional bias rather than a deliberate
// training identity.

const OUTFIELD_FOCUS_SHARE_THRESHOLD = 0.5;

const ARCHETYPES = [
  { id: "counter-attacking", focusKeys: ["pace"] },
  { id: "defensive-wall", focusKeys: ["defending"] },
  { id: "possession", focusKeys: ["passing", "technique"] },
];

function isEligibleOutfielder(player) {
  return !player.isTrial && POSITION_TYPES[player.position] !== "GK";
}

// Returns the archetype id string ("counter-attacking" | "defensive-wall" |
// "possession") when 50%+ of the squad's outfield players are trained on a
// single archetype's focus family, or null when nothing clears the bar.
export function classifySquadIdentity(squad) {
  if (!Array.isArray(squad) || squad.length === 0) return null;

  const outfield = squad.filter(isEligibleOutfielder);
  if (outfield.length === 0) return null;

  const qualifying = ARCHETYPES.filter((archetype) => {
    const onFocus = outfield.filter((p) => archetype.focusKeys.includes(p.training));
    return onFocus.length / outfield.length >= OUTFIELD_FOCUS_SHARE_THRESHOLD;
  });

  // Focus families are disjoint, so at most one archetype can qualify.
  return qualifying.length > 0 ? qualifying[0].id : null;
}
