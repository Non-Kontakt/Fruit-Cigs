export const LEAGUE_DEFS = {
  1: {
    name: "Intergalactic Elite",
    shortName: "IE",
    color: "#c084fc",
    ovrMin: 17, ovrMax: 20,
    natMix: [["ALN",70],["BRA",8],["ARG",6],["FRA",5],["ESP",4],["GER",4],["NGA",3]],
    teams: [
      { name: "Nebula FC",      color: "#c084fc", strength: 0.95, trait: "dominant" },
      { name: "Void United",    color: "#1e1b4b", strength: 0.90, trait: "stars" },
      { name: "Quasar",         color: "#06b6d4", strength: 0.85, trait: "methodical" },
      { name: "Pulsar City",    color: "#f59e0b", strength: 0.80, trait: "physical" },
      { name: "Dark Matter XI", color: "#64748b", strength: 0.75, trait: "defensive" },
      { name: "Supernova",      color: "#ef4444", strength: 0.70, trait: "free_scoring" },
      { name: "Antimatter",     color: "#22d3ee", strength: 0.65, trait: "flair" },
      { name: "Cosmic Drift",   color: "#a78bfa", strength: 0.60, trait: "gritty" },
      { name: "Event Horizon",  color: "#fbbf24", strength: 0.55, trait: "set_piece" },
      { name: "Singularity",    color: "#7c3aed", strength: 0.50, trait: "methodical" },
    ],
  },
  2: {
    name: "World XI Invitational",
    shortName: "WXII",
    color: "#fbbf24",
    ovrMin: 15, ovrMax: 18,
    natMix: [["BRA",14],["ARG",11],["FRA",11],["ESP",9],["GER",7],["POR",7],["ITA",6],["NED",5],["ENG",5],["NGA",4],["HRV",4],["JPN",3],["KOR",3],["BEL",2],["COL",2],["SEN",2],["URY",2],["GHA",1.5],["SRB",1.5]],
    teams: [
      { name: "World Select",     color: "#fbbf24", strength: 0.90, trait: "stars",        natMix: [["BRA",40],["ARG",25],["COL",15],["URY",10],["POR",10]] },
      { name: "Global United",    color: "#ef4444", strength: 0.85, trait: "dominant",      natMix: [["FRA",40],["BEL",20],["SEN",15],["NGA",15],["GHA",10]] },
      { name: "All-Stars FC",     color: "#3b82f6", strength: 0.80, trait: "flair",         natMix: [["ESP",40],["POR",25],["ITA",20],["GRE",10],["TUR",5]] },
      { name: "Inter Mondiale",   color: "#1e3a5f", strength: 0.75, trait: "methodical",    natMix: [["GER",40],["AUT",20],["SUI",15],["NED",15],["POL",10]] },
      { name: "Planet XI",        color: "#22c55e", strength: 0.70, trait: "physical",       natMix: [["NGA",30],["GHA",25],["SEN",20],["CMR",15],["EGY",10]] },
      { name: "Cosmos",           color: "#8b5cf6", strength: 0.65, trait: "set_piece",      natMix: [["ENG",40],["SCO",20],["WAL",15],["IRL",15],["NIR",10]] },
      { name: "Universal",        color: "#e2e8f0", strength: 0.60, trait: "defensive",      natMix: [["ITA",40],["HRV",20],["SRB",15],["GRE",15],["TUR",10]] },
      { name: "Continentals",     color: "#f97316", strength: 0.55, trait: "gritty",         natMix: [["JPN",35],["KOR",25],["AUS",20],["CHN",10],["IND",10]] },
      { name: "Earth XI",         color: "#06b6d4", strength: 0.50, trait: "free_scoring",   natMix: [["ARG",35],["URY",20],["BRA",20],["COL",15],["MEX",10]] },
      { name: "Intercontinentals",color: "#dc2626", strength: 0.45, trait: "defensive",      natMix: [["NED",35],["BEL",25],["DEN",15],["SWE",15],["NOR",10]] },
    ],
  },
  3: {
    name: "Euro Dynasty",
    shortName: "Euro",
    color: "#1e3a8a",
    ovrMin: 13, ovrMax: 16,
    natMix: [["ESP",14],["FRA",14],["GER",11],["ITA",11],["POR",9],["NED",7],["HRV",4],["TUR",4],["SWE",4],["ENG",4],["BRA",3],["ARG",3],["BEL",3],["SRB",2],["SUI",2],["POL",1.5],["DEN",1.5],["AUT",1],["GRE",1]],
    teams: [
      { name: "Castilia FC",   color: "#e2e8f0", strength: 0.90, trait: "dominant" },
      { name: "Paris Lumière", color: "#1e3a8a", strength: 0.85, trait: "stars" },
      { name: "Die Falken",    color: "#ef4444", strength: 0.80, trait: "methodical" },
      { name: "Corvo Nero",    color: "#ef4444", strength: 0.75, trait: "defensive" },
      { name: "De Grachten",   color: "#ef4444", strength: 0.70, trait: "flair" },
      { name: "Savoia FC",     color: "#e2e8f0", strength: 0.65, trait: "gritty" },
      { name: "FC Tramuntana", color: "#1e3a8a", strength: 0.60, trait: "flair" },
      { name: "Westfalia FC",  color: "#facc15", strength: 0.55, trait: "free_scoring" },
      { name: "Lusitânia SC",  color: "#ef4444", strength: 0.50, trait: "set_piece" },
      { name: "Navegantes FC", color: "#22c55e", strength: 0.45, trait: "gritty" },
    ],
  },
  4: {
    name: "Saudi Super League",
    shortName: "SSL",
    color: "#22c55e",
    ovrMin: 11, ovrMax: 14,
    natMix: [["SAU",52],["BRA",11],["ARG",7],["FRA",5],["ESP",4],["POR",4],["NGA",3],["MAR",3],["CIV",2],["ENG",2],["SEN",2],["EGY",2],["COL",1.5],["GHA",1.5]],
    teams: [
      { name: "Al-Badiyah",    color: "#3b82f6", strength: 0.90, trait: "dominant" },
      { name: "Al-Saqr",       color: "#facc15", strength: 0.85, trait: "stars" },
      { name: "Al-Majd",       color: "#fbbf24", strength: 0.78, trait: "physical" },
      { name: "Al-Barq",       color: "#22c55e", strength: 0.72, trait: "gritty" },
      { name: "Al-Faris",      color: "#e2e8f0", strength: 0.65, trait: "methodical" },
      { name: "Al-Naseem",     color: "#f97316", strength: 0.58, trait: "defensive" },
      { name: "Al-Hawa",       color: "#ef4444", strength: 0.52, trait: "set_piece" },
      { name: "Al-Noor",       color: "#06b6d4", strength: 0.45, trait: "flair" },
      { name: "Al-Amal",       color: "#a78bfa", strength: 0.40, trait: "free_scoring" },
      { name: "Al-Waha",       color: "#4ade80", strength: 0.35, trait: "set_piece" },
    ],
  },
  5: {
    name: "The Federation",
    shortName: "Fed",
    color: "#facc15",
    ovrMin: 10, ovrMax: 13,
    natMix: [["ENG",32],["FRA",9],["BRA",7],["ESP",6],["GER",5],["POR",5],["NED",4],["ARG",4],["ITA",4],["NGA",3],["SCO",3],["IRL",3],["MAR",2],["JPN",2],["HRV",2],["BEL",2],["GHA",1.5],["SEN",1.5],["DEN",1],["NOR",1],["CIV",1],["POL",1]],
    teams: [
      { name: "Imperials",   color: "#facc15", strength: 0.90, trait: "dominant" },
      { name: "Royals",      color: "#c084fc", strength: 0.85, trait: "stars" },
      { name: "Titans",      color: "#ef4444", strength: 0.78, trait: "methodical" },
      { name: "Cavaliers",   color: "#f59e0b", strength: 0.72, trait: "gritty" },
      { name: "Dynamo",      color: "#06b6d4", strength: 0.65, trait: "physical" },
      { name: "Academica",   color: "#818cf8", strength: 0.58, trait: "flair" },
      { name: "Olympians",   color: "#4ade80", strength: 0.52, trait: "set_piece" },
      { name: "Centurions", color: "#fb923c", strength: 0.45, trait: "defensive" },
      { name: "Vanguard",   color: "#e2e8f0", strength: 0.40, trait: "free_scoring" },
      { name: "Phoenix",     color: "#f97316", strength: 0.33, trait: "gritty" },
    ],
  },
  6: {
    name: "Altitude Trials",
    shortName: "AT",
    color: "#60a5fa",
    ovrMin: 8, ovrMax: 11,
    natMix: [["ENG",47],["SCO",7],["WAL",6],["IRL",5],["NIR",4],["FRA",5],["ESP",4],["BRA",3],["POR",3],["GER",3],["NED",2],["NGA",2],["ARG",2],["MAR",2],["JAM",1.5],["GHA",1],["SEN",1],["POL",1],["CIV",0.5]],
    teams: [
      { name: "Albion",    color: "#f59e0b", strength: 0.90, trait: "gritty" },
      { name: "United",    color: "#ef4444", strength: 0.82, trait: "stars" },
      { name: "Clarets",   color: "#6366f1", strength: 0.74, trait: "methodical" },
      { name: "Athletic",  color: "#06b6d4", strength: 0.66, trait: "physical" },
      { name: "City",      color: "#3b82f6", strength: 0.58, trait: "dominant" },
      { name: "Crusaders", color: "#84cc16", strength: 0.50, trait: "set_piece" },
      { name: "Wanderers", color: "#ec4899", strength: 0.42, trait: "flair" },
      { name: "Rovers",    color: "#8b5cf6", strength: 0.35, trait: "defensive" },
      { name: "Town",      color: "#f97316", strength: 0.28, trait: "free_scoring" },
      { name: "Spires",    color: "#ef4444", strength: 0.21, trait: "methodical" },
    ],
  },
  7: {
    name: "Forest Hills",
    shortName: "Hills",
    color: "#f87171",
    ovrMin: 7, ovrMax: 9,
    natMix: [["ENG",58],["SCO",8],["WAL",7],["IRL",6],["NIR",5],["FRA",3],["ESP",2],["BRA",2],["POR",2],["GER",2],["NGA",1.5],["MAR",1.5],["JAM",1],["POL",1]],
    teams: [
      { name: "Borough",    color: "#fb923c", strength: 0.90, trait: "gritty" },
      { name: "Harriers",   color: "#22c55e", strength: 0.80, trait: "physical" },
      { name: "Thistle",    color: "#a78bfa", strength: 0.72, trait: "defensive" },
      { name: "County",     color: "#facc15", strength: 0.64, trait: "methodical" },
      { name: "Meridians",  color: "#ef4444", strength: 0.55, trait: "set_piece" },
      { name: "Diamonds",   color: "#67e8f9", strength: 0.48, trait: "free_scoring" },
      { name: "Hussars",    color: "#e2e8f0", strength: 0.40, trait: "stars" },
      { name: "Vespers",    color: "#3b82f6", strength: 0.32, trait: "flair" },
      { name: "Nomads",     color: "#a3e635", strength: 0.25, trait: "dominant" },
      { name: "Stanley",    color: "#94a3b8", strength: 0.18, trait: "defensive" },
    ],
  },
  8: {
    name: "The Dojo",
    shortName: "Dojo",
    color: "#fb923c",
    ovrMin: 5, ovrMax: 8,
    natMix: [["JPN",30],["KOR",22],["CHN",15],["ENG",10],["BRA",5],["FRA",5],["ESP",5],["GER",3],["ARG",3],["POR",2]],
    teams: [
      { name: "Dunwich",      color: "#ef4444", strength: 0.88, trait: "methodical" },
      { name: "Drumcairn",   color: "#f97316", strength: 0.78, trait: "gritty" },
      { name: "Colthurst",   color: "#3b82f6", strength: 0.70, trait: "physical" },
      { name: "Tidewick",    color: "#1e3a8a", strength: 0.62, trait: "dominant" },
      { name: "Caldervale",  color: "#e2e8f0", strength: 0.54, trait: "flair" },
      { name: "Coppermill",  color: "#3b82f6", strength: 0.46, trait: "defensive" },
      { name: "Ravensbourne",color: "#f97316", strength: 0.38, trait: "stars" },
      { name: "Glendurn",    color: "#ef4444", strength: 0.30, trait: "set_piece" },
      { name: "Greywick",    color: "#e2e8f0", strength: 0.22, trait: "free_scoring" },
      { name: "Steelton",    color: "#ef4444", strength: 0.15, trait: "gritty" },
    ],
  },
  9: {
    name: "Sunday League",
    shortName: "Sun",
    color: "#a78bfa",
    ovrMin: 4, ovrMax: 7,
    natMix: [["ENG",70],["SCO",7],["WAL",7],["IRL",5],["NIR",4],["FRA",2],["ESP",1.5],["BRA",1.5],["POR",1],["GER",1]],
    teams: [
      { name: "Pelsworth",  color: "#ef4444", strength: 0.85, trait: "gritty" },
      { name: "Wykeford",   color: "#3b82f6", strength: 0.75, trait: "physical" },
      { name: "Calverton",  color: "#f59e0b", strength: 0.65, trait: "methodical" },
      { name: "Fernholt",   color: "#ef4444", strength: 0.58, trait: "defensive" },
      { name: "Westleigh",  color: "#facc15", strength: 0.50, trait: "set_piece" },
      { name: "Brindleby",  color: "#3b82f6", strength: 0.42, trait: "dominant" },
      { name: "Ashwick",    color: "#a78bfa", strength: 0.35, trait: "flair" },
      { name: "Marsdale",   color: "#1e3a8a", strength: 0.28, trait: "stars" },
      { name: "Walcott",    color: "#22c55e", strength: 0.20, trait: "free_scoring" },
      { name: "Durnwick",   color: "#e2e8f0", strength: 0.13, trait: "defensive" },
    ],
  },
  10: {
    name: "The Alley",
    shortName: "Alley",
    color: "#94a3b8",
    ovrMin: 3, ovrMax: 5,
    natMix: [["ENG",78],["SCO",5],["WAL",5],["IRL",4],["NIR",4],["FRA",1],["ESP",1],["BRA",1],["POR",1]],
    teams: [
      { name: "Eastfield",  color: "#84cc16", strength: 0.85, trait: "gritty" },
      { name: "Northbrook", color: "#3b82f6", strength: 0.75, trait: "physical" },
      { name: "Millhaven",  color: "#f97316", strength: 0.65, trait: "methodical" },
      { name: "Elmcroft",   color: "#ef4444", strength: 0.55, trait: "dominant" },
      { name: "Crestwood",  color: "#22c55e", strength: 0.48, trait: "defensive" },
      { name: "Pinehurst",  color: "#a78bfa", strength: 0.40, trait: "set_piece" },
      { name: "Lakeside",   color: "#06b6d4", strength: 0.32, trait: "flair" },
      { name: "Greensand",  color: "#e2e8f0", strength: 0.25, trait: "stars" },
      { name: "Seaview",    color: "#64748b", strength: 0.18, trait: "free_scoring" },
      { name: "Nettlewick", color: "#f59e0b", strength: 0.11, trait: "set_piece" },
    ],
  },
  11: {
    name: "Concrete Schoolyard",
    shortName: "Yard",
    color: "#64748b",
    ovrMin: 1, ovrMax: 4,
    natMix: [["ENG",85],["SCO",4],["WAL",3],["IRL",3],["NIR",3],["FRA",1],["ESP",1]],
    teams: [
      { name: "Dog & Duck",     color: "#f59e0b", strength: 0.85, trait: "gritty" },
      { name: "Red Lion FC",    color: "#ef4444", strength: 0.75, trait: "physical" },
      { name: "Golden Boot",    color: "#facc15", strength: 0.65, trait: "dominant" },
      { name: "The Plough",     color: "#84cc16", strength: 0.55, trait: "methodical" },
      { name: "Crown & Anchor", color: "#8b5cf6", strength: 0.48, trait: "defensive" },
      { name: "Star & Garter",  color: "#e2e8f0", strength: 0.40, trait: "set_piece" },
      { name: "Lazy Fox",       color: "#f97316", strength: 0.32, trait: "flair" },
      { name: "Rose & Crown",   color: "#ec4899", strength: 0.25, trait: "stars" },
      { name: "Bull & Bear",    color: "#06b6d4", strength: 0.18, trait: "free_scoring" },
    ],
  },
};

export const NUM_TIERS = 11;

export const TEAM_CONFIGS = LEAGUE_DEFS[11].teams; // backwards compat for any stray references

export const TEAM_TRAITS = {
  gritty: {
    label: "Comeback Kings",
    desc: "Never give up. Late goals and fight back when losing.",
  },
  stars: {
    label: "Stars",
    desc: "Star players score braces and hat-tricks. Lethal on the counter.",
  },
  methodical: {
    label: "Methodical",
    desc: "Clean and disciplined. Rarely foul, win by small margins.",
  },
  physical: {
    label: "Physical",
    desc: "Tough and rarely injured. Low-scoring, never beaten by more than 2.",
  },
  dominant: {
    label: "Dominant",
    desc: "Control possession and force opponents to be clinical.",
  },
  set_piece: {
    label: "Set Piece Specialists",
    desc: "Dangerous from corners and free kicks.",
  },
  flair: {
    label: "Foreign Flair",
    desc: "Players dive to win set pieces, but risk bookings for simulation.",
  },
  defensive: {
    label: "Park The Bus",
    desc: "Hard to break down. Grind out results and keep clean sheets.",
  },
  free_scoring: {
    label: "Free Scoring",
    desc: "Wildly inconsistent but entertaining. Can beat anyone or lose to anyone.",
  },
};

// Trait-driven squad management philosophy.
// baseSize: target squad size (14-25). Physical teams need rotation depth; stars keep it lean.
// baseYouthRate: 0-1 preference for youth intake (high) vs experienced signings (low).
// recruitWeights: position-type bias when recruiting (GK/DEF/MID/FWD).
export const TRAIT_SQUAD_STYLE = {
  physical:     { baseSize: 23, baseYouthRate: 0.55, recruitWeights: { GK: 1, DEF: 4, MID: 3, FWD: 1 } }, // High-intensity pressing tires players → need large rotation squad
  dominant:     { baseSize: 22, baseYouthRate: 0.50, recruitWeights: { GK: 1, DEF: 2, MID: 4, FWD: 2 } }, // Possession demands midfield quality everywhere
  defensive:    { baseSize: 21, baseYouthRate: 0.65, recruitWeights: { GK: 2, DEF: 5, MID: 2, FWD: 1 } }, // Need cover at every defensive slot; light on attackers
  gritty:       { baseSize: 21, baseYouthRate: 0.75, recruitWeights: { GK: 1, DEF: 3, MID: 3, FWD: 2 } }, // Academy culture — big homegrown squad of battlers
  set_piece:    { baseSize: 20, baseYouthRate: 0.55, recruitWeights: { GK: 2, DEF: 4, MID: 2, FWD: 2 } }, // Aerial threat needs tall defenders; value a commanding backup keeper
  methodical:   { baseSize: 19, baseYouthRate: 0.60, recruitWeights: { GK: 1, DEF: 2, MID: 4, FWD: 2 } }, // Quality over quantity in the engine room
  flair:        { baseSize: 18, baseYouthRate: 0.45, recruitWeights: { GK: 1, DEF: 1, MID: 3, FWD: 4 } }, // Neglect the back line for creative talent
  stars:        { baseSize: 17, baseYouthRate: 0.30, recruitWeights: { GK: 1, DEF: 2, MID: 2, FWD: 4 } }, // Buy don't develop; invest in elite attackers
  free_scoring: { baseSize: 17, baseYouthRate: 0.40, recruitWeights: { GK: 1, DEF: 1, MID: 2, FWD: 5 } }, // Live and die by the sword — almost all attackers
};

export const AI_BENCH_POSITIONS = ["CB","CM","CM","ST","AM"];
