export const ATTRIBUTES = [
  { key: "pace", label: "PAC", color: "#4ade80" },
  { key: "shooting", label: "SHO", color: "#f87171" },
  { key: "passing", label: "PAS", color: "#60a5fa" },
  { key: "defending", label: "DEF", color: "#fbbf24" },
  { key: "physical", label: "PHY", color: "#c084fc" },
  { key: "technique", label: "TEC", color: "#2dd4bf" },
  { key: "mental", label: "MEN", color: "#fb923c" },
];

export const TRAINING_FOCUSES = [
  { key: "pace", label: "Speed Drills", shortLabel: "SPD", icon: "⚡", attrs: ["pace"], desc: "Sprint work & agility" },
  { key: "shooting", label: "Finishing", shortLabel: "SHO", icon: "🎯", attrs: ["shooting"], desc: "Shot practice & placement" },
  { key: "passing", label: "Playmaking", shortLabel: "PAS", icon: "📐", attrs: ["passing"], desc: "Passing patterns & vision" },
  { key: "defending", label: "Defensive Work", shortLabel: "DEF", icon: "🛡️", attrs: ["defending"], desc: "Tackling & positioning" },
  { key: "physical", label: "Gym & Conditioning", shortLabel: "PHY", icon: "💪", attrs: ["physical"], desc: "Strength & stamina" },
  { key: "technique", label: "Ball Mastery", shortLabel: "TEC", icon: "✨", attrs: ["technique"], desc: "Close control & dribbling" },
  { key: "mental", label: "Tactical Study", shortLabel: "MEN", icon: "🧠", attrs: ["mental"], desc: "Game IQ & composure" },
  { key: "balanced", label: "General Training", shortLabel: "GEN", icon: "⚽", attrs: ["pace", "shooting", "passing", "defending", "physical", "technique", "mental"], desc: "A bit of everything" },
];

export const TRAINING_INJURIES = [
  { name: "Twisted Ankle", weeksOut: 1 },
  { name: "Minor Hamstring Strain", weeksOut: 1 },
  { name: "Dead Leg", weeksOut: 1 },
  { name: "Bruised Ribs", weeksOut: 1 },
  { name: "Calf Tightness", weeksOut: 1 },
  { name: "Groin Strain", weeksOut: 2 },
  { name: "Knee Knock", weeksOut: 1 },
  { name: "Pulled Muscle", weeksOut: 2 },
  { name: "Shin Splints", weeksOut: 2 },
  { name: "Back Spasm", weeksOut: 1 },
];
