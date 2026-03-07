export const FORMATION_PRESETS = {
  "4-4-2": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 12, y: 68 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 88, y: 68 },
    { pos: "LW", x: 12, y: 42 }, { pos: "CM", x: 35, y: 46 }, { pos: "CM", x: 65, y: 46 }, { pos: "RW", x: 88, y: 42 },
    { pos: "ST", x: 35, y: 16 }, { pos: "ST", x: 65, y: 16 },
  ],
  "4-3-3": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 12, y: 68 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 88, y: 68 },
    { pos: "CM", x: 28, y: 48 }, { pos: "CM", x: 50, y: 44 }, { pos: "CM", x: 72, y: 48 },
    { pos: "LW", x: 18, y: 20 }, { pos: "ST", x: 50, y: 14 }, { pos: "RW", x: 82, y: 20 },
  ],
  "4-2-3-1": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 12, y: 68 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 88, y: 68 },
    { pos: "CM", x: 35, y: 52 }, { pos: "CM", x: 65, y: 52 },
    { pos: "LW", x: 18, y: 34 }, { pos: "AM", x: 50, y: 30 }, { pos: "RW", x: 82, y: 34 },
    { pos: "ST", x: 50, y: 12 },
  ],
  "3-5-2": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "CB", x: 28, y: 72 }, { pos: "CB", x: 50, y: 70 }, { pos: "CB", x: 72, y: 72 },
    { pos: "LW", x: 8, y: 46 }, { pos: "CM", x: 32, y: 50 }, { pos: "AM", x: 50, y: 42 }, { pos: "CM", x: 68, y: 50 }, { pos: "RW", x: 92, y: 46 },
    { pos: "ST", x: 35, y: 16 }, { pos: "ST", x: 65, y: 16 },
  ],
  "4-5-1": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 12, y: 68 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 88, y: 68 },
    { pos: "LW", x: 10, y: 42 }, { pos: "CM", x: 30, y: 48 }, { pos: "CM", x: 50, y: 44 }, { pos: "CM", x: 70, y: 48 }, { pos: "RW", x: 90, y: 42 },
    { pos: "ST", x: 50, y: 14 },
  ],
  "5-3-2": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 8, y: 64 }, { pos: "CB", x: 28, y: 72 }, { pos: "CB", x: 50, y: 70 }, { pos: "CB", x: 72, y: 72 }, { pos: "RB", x: 92, y: 64 },
    { pos: "CM", x: 30, y: 46 }, { pos: "AM", x: 50, y: 40 }, { pos: "CM", x: 70, y: 46 },
    { pos: "ST", x: 35, y: 16 }, { pos: "ST", x: 65, y: 16 },
  ],
  "3-4-3": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "CB", x: 28, y: 72 }, { pos: "CB", x: 50, y: 70 }, { pos: "CB", x: 72, y: 72 },
    { pos: "LW", x: 10, y: 48 }, { pos: "CM", x: 35, y: 50 }, { pos: "CM", x: 65, y: 50 }, { pos: "RW", x: 90, y: 48 },
    { pos: "LW", x: 20, y: 20 }, { pos: "ST", x: 50, y: 14 }, { pos: "RW", x: 80, y: 20 },
  ],
  "4-1-2-1-2": [
    { pos: "GK", x: 50, y: 90 },
    { pos: "LB", x: 12, y: 68 }, { pos: "CB", x: 35, y: 72 }, { pos: "CB", x: 65, y: 72 }, { pos: "RB", x: 88, y: 68 },
    { pos: "CM", x: 50, y: 54 },
    { pos: "CM", x: 28, y: 42 }, { pos: "CM", x: 72, y: 42 },
    { pos: "AM", x: 50, y: 30 },
    { pos: "ST", x: 35, y: 14 }, { pos: "ST", x: 65, y: 14 },
  ],
};

export const DEFAULT_FORMATION = FORMATION_PRESETS["4-2-3-1"];
