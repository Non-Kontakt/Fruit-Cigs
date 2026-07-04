import { POSITION_TYPES } from "../data/positions.js";
import { pickRandom } from "./calc.js";

// One-line flavour for free agents, banded by age. generateFreeAgent only
// ever rolls ages 22-28, so the bands are narrower than "young pro/veteran"
// might suggest elsewhere in the game — they're split across that real
// range rather than a full career span.
const ROLE_LABEL = { GK: "between the sticks", DEF: "at the back", MID: "in midfield", FWD: "up front" };

const YOUNG_BACKSTORIES = [
  (role) => `Was tipped as one to watch a couple of seasons ago, but the game time ${role} never came and the move stalled.`,
  () => "Came through a well-regarded academy but never forced his way past better-connected teammates.",
  () => "Still young enough to matter, old enough that scouts have quietly moved on to the next prospect.",
  () => "Turned heads in trials but kept picking up niggling injuries at the worst possible moments.",
  () => "Released when his youth contract ran out and nobody higher up made the call to keep him on.",
];

const PRIME_BACKSTORIES = [
  () => "Let go after a dressing-room reshuffle that had nothing to do with form.",
  (role) => `Fell out of favour when a new manager arrived with his own ideas about who plays ${role}.`,
  () => "Spent two seasons in the wilderness after an ankle injury and has been scrapping for a recall ever since.",
  () => "Released after a contract dispute that dragged on until neither side wanted to fix it.",
  () => "Good enough for most changing rooms, just never settled anywhere long enough to matter.",
];

const VETERAN_BACKSTORIES = [
  () => "Knows this might be the last contract of his career and isn't interested in wasting it.",
  () => "Has done the rounds at half a dozen clubs and reckons he's got one good season left in him.",
  () => "Was let go to make room for younger legs — the legs still work fine, thanks very much.",
  () => "Turned down a coaching badge course to give playing one more real go.",
  () => "Has seen enough dressing rooms to know exactly what he's walking into, and he's fine with that.",
];

export function getFreeAgentBackstory(age, position) {
  const role = ROLE_LABEL[POSITION_TYPES[position]] || "in the squad";
  const pool = age <= 23 ? YOUNG_BACKSTORIES : age >= 27 ? VETERAN_BACKSTORIES : PRIME_BACKSTORIES;
  return pickRandom(pool)(role);
}
