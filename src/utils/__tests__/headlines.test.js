import { describe, it, expect } from "vitest";
import { selectHeadlineCategory, generateMatchHeadline, generateIdentityHeadline, generateAwardsHeadline } from "../headlines.js";

const BASE = {
  teamName: "City",
  opponentName: "Rovers",
  reporterName: "Sid Marsh",
};

function win(extra = {}) {
  return { ...BASE, playerGoals: 2, oppGoals: 0, ...extra };
}

function loss(extra = {}) {
  return { ...BASE, playerGoals: 0, oppGoals: 2, ...extra };
}

function draw(extra = {}) {
  return { ...BASE, playerGoals: 1, oppGoals: 1, ...extra };
}

// ---------------------------------------------------------------------------
// selectHeadlineCategory
// ---------------------------------------------------------------------------
describe("selectHeadlineCategory", () => {
  it("cup_final_win when isCupFinal and won", () => {
    expect(selectHeadlineCategory(win({ isCupFinal: true }))).toBe("cup_final_win");
  });

  it("cup_final_loss when isCupFinal and lost", () => {
    expect(selectHeadlineCategory(loss({ isCupFinal: true }))).toBe("cup_final_loss");
  });

  it("cup final beats hattrick", () => {
    const ctx = win({
      isCupFinal: true,
      scorers: [{ name: "Reeves", goals: 3 }],
    });
    expect(selectHeadlineCategory(ctx)).toBe("cup_final_win");
  });

  it("record when recordUnbeatenRun and won", () => {
    expect(selectHeadlineCategory(win({ recordUnbeatenRun: true, unbeatenRun: 20 }))).toBe("record");
  });

  it("record fires on a draw too, since the rule is won OR drawn", () => {
    expect(selectHeadlineCategory(draw({ seasonBiggestWin: true }))).toBe("record");
  });

  it("record beats hattrick", () => {
    const ctx = win({
      seasonBiggestWin: true,
      scorers: [{ name: "Reeves", goals: 3 }],
    });
    expect(selectHeadlineCategory(ctx)).toBe("record");
  });

  it("hattrick when a scorer has 3+ goals and match won", () => {
    const ctx = win({ scorers: [{ name: "Reeves", goals: 3 }] });
    expect(selectHeadlineCategory(ctx)).toBe("hattrick");
  });

  it("hattrick requires won or drawn (not on a loss)", () => {
    const ctx = loss({ scorers: [{ name: "Reeves", goals: 3 }] });
    expect(selectHeadlineCategory(ctx)).not.toBe("hattrick");
  });

  it("hattrick beats streak_hot", () => {
    const ctx = win({
      scorers: [{ name: "Reeves", goals: 3 }],
      winStreak: 6,
    });
    expect(selectHeadlineCategory(ctx)).toBe("hattrick");
  });

  it("derby_win fires when isDerby and won (dormant hook, still functions if set)", () => {
    expect(selectHeadlineCategory(win({ isDerby: true }))).toBe("derby_win");
  });

  it("derby_loss fires when isDerby and lost", () => {
    expect(selectHeadlineCategory(loss({ isDerby: true }))).toBe("derby_loss");
  });

  it("derby is dormant — isDerby absent/false never selects derby categories", () => {
    const ctx = win({ winStreak: 6 });
    expect(selectHeadlineCategory(ctx)).not.toMatch(/^derby_/);
    expect(selectHeadlineCategory(win())).not.toMatch(/^derby_/);
  });

  it("derby beats went_top", () => {
    const ctx = win({ isDerby: true, wentTop: true });
    expect(selectHeadlineCategory(ctx)).toBe("derby_win");
  });

  it("went_top when wentTop and won", () => {
    expect(selectHeadlineCategory(win({ wentTop: true }))).toBe("went_top");
  });

  it("went_top beats streak_hot", () => {
    const ctx = win({ wentTop: true, winStreak: 6 });
    expect(selectHeadlineCategory(ctx)).toBe("went_top");
  });

  it("streak_hot when winStreak >= 4 and won", () => {
    expect(selectHeadlineCategory(win({ winStreak: 4 }))).toBe("streak_hot");
  });

  it("streak_hot when unbeatenRun >= 6 and drawn", () => {
    expect(selectHeadlineCategory(draw({ unbeatenRun: 6 }))).toBe("streak_hot");
  });

  it("streak_hot beats streak_cold (mutually exclusive by won/lost anyway) and board_crisis via priority", () => {
    // streak_hot only applies on won/drawn, board_crisis only on lost — priority still verified structurally
    const ctx = win({ winStreak: 5, boardSentiment: 10 });
    expect(selectHeadlineCategory(ctx)).toBe("streak_hot");
  });

  it("streak_cold when lossStreak >= 3 and lost", () => {
    expect(selectHeadlineCategory(loss({ lossStreak: 3 }))).toBe("streak_cold");
  });

  it("streak_cold beats board_crisis", () => {
    const ctx = loss({ lossStreak: 4, boardSentiment: 5 });
    expect(selectHeadlineCategory(ctx)).toBe("streak_cold");
  });

  it("board_crisis when lost and boardSentiment <= 25", () => {
    expect(selectHeadlineCategory(loss({ boardSentiment: 20 }))).toBe("board_crisis");
  });

  it("board_crisis beats thrashing_loss", () => {
    const ctx = loss({ playerGoals: 0, oppGoals: 4, boardSentiment: 10 });
    expect(selectHeadlineCategory(ctx)).toBe("board_crisis");
  });

  it("thrashing_win when won by 3+", () => {
    expect(selectHeadlineCategory(win({ playerGoals: 4, oppGoals: 0 }))).toBe("thrashing_win");
  });

  it("thrashing_loss when lost by 3+", () => {
    expect(selectHeadlineCategory(loss({ playerGoals: 0, oppGoals: 3 }))).toBe("thrashing_loss");
  });

  it("thrashing beats clean_sheet_run", () => {
    const ctx = win({
      playerGoals: 4,
      oppGoals: 0,
      cleanSheet: true,
      cleanSheetStreak: 5,
    });
    expect(selectHeadlineCategory(ctx)).toBe("thrashing_win");
  });

  it("clean_sheet_run when won, cleanSheet, cleanSheetStreak >= 3", () => {
    const ctx = win({ playerGoals: 1, oppGoals: 0, cleanSheet: true, cleanSheetStreak: 3 });
    expect(selectHeadlineCategory(ctx)).toBe("clean_sheet_run");
  });

  it("falls back to win", () => {
    expect(selectHeadlineCategory(win({ playerGoals: 1, oppGoals: 0 }))).toBe("win");
  });

  it("falls back to draw", () => {
    expect(selectHeadlineCategory(draw())).toBe("draw");
  });

  it("falls back to loss", () => {
    expect(selectHeadlineCategory(loss({ playerGoals: 0, oppGoals: 1 }))).toBe("loss");
  });
});

// ---------------------------------------------------------------------------
// generateMatchHeadline — every category
// ---------------------------------------------------------------------------
describe("generateMatchHeadline", () => {
  const cases = [
    {
      category: "cup_final_win",
      ctx: () => win({ isCupFinal: true, cupRoundName: "Final" }),
      expectIn: ["ROVERS"],
    },
    {
      category: "cup_final_loss",
      ctx: () => loss({ isCupFinal: true, cupRoundName: "Final" }),
      expectIn: ["ROVERS"],
    },
    {
      category: "record",
      ctx: () => win({ seasonBiggestWin: true, playerGoals: 5, oppGoals: 0 }),
      expectIn: ["CITY"],
    },
    {
      category: "hattrick",
      ctx: () => win({ scorers: [{ name: "Reeves", goals: 3 }] }),
      expectIn: ["REEVES"],
    },
    {
      category: "derby_win",
      ctx: () => win({ isDerby: true }),
      expectIn: ["ROVERS"],
    },
    {
      category: "derby_loss",
      ctx: () => loss({ isDerby: true }),
      expectIn: ["ROVERS"],
    },
    {
      category: "went_top",
      ctx: () => win({ wentTop: true }),
      expectIn: ["ROVERS"],
    },
    {
      category: "streak_hot",
      ctx: () => win({ winStreak: 5 }),
      expectIn: ["5"],
    },
    {
      category: "streak_cold",
      ctx: () => loss({ lossStreak: 4 }),
      expectIn: ["4"],
    },
    {
      category: "board_crisis",
      ctx: () => loss({ boardSentiment: 15 }),
      expectIn: ["ROVERS"],
    },
    {
      category: "thrashing_win",
      ctx: () => win({ playerGoals: 5, oppGoals: 0 }),
      expectIn: ["ROVERS"],
    },
    {
      category: "thrashing_loss",
      ctx: () => loss({ playerGoals: 0, oppGoals: 4 }),
      expectIn: ["ROVERS"],
    },
    {
      category: "clean_sheet_run",
      ctx: () => win({ playerGoals: 1, oppGoals: 0, cleanSheet: true, cleanSheetStreak: 4 }),
      expectIn: ["4"],
    },
    {
      category: "win",
      ctx: () => win({ playerGoals: 1, oppGoals: 0 }),
      expectIn: ["ROVERS"],
    },
    {
      category: "draw",
      ctx: () => draw(),
      expectIn: ["ROVERS"],
    },
    {
      category: "loss",
      ctx: () => loss({ playerGoals: 0, oppGoals: 1 }),
      expectIn: ["ROVERS"],
    },
  ];

  for (const { category, ctx, expectIn } of cases) {
    it(`${category}: produces the expected category and a specific, non-empty headline`, () => {
      for (let i = 0; i < 15; i++) {
        const result = generateMatchHeadline(ctx());
        expect(result.category).toBe(category);
        expect(typeof result.headline).toBe("string");
        expect(result.headline.length).toBeGreaterThan(0);
        for (const needle of expectIn) {
          expect(result.headline).toContain(needle);
        }
      }
    });
  }

  it("scoreline appears in fallback win/draw/loss headlines", () => {
    const w = generateMatchHeadline(win({ playerGoals: 2, oppGoals: 1 }));
    expect(w.headline).toContain("2-1");
    const d = generateMatchHeadline(draw({ playerGoals: 3, oppGoals: 3 }));
    expect(d.headline).toContain("3-3");
  });

  it("byline is present when reporterName is given (in byline field or woven into headline)", () => {
    const ctx = win({ reporterName: "Dot Pryce" });
    let foundReporterSomewhere = false;
    for (let i = 0; i < 20; i++) {
      const result = generateMatchHeadline(ctx);
      const woven = result.headline.includes("DOT PRYCE");
      const inByline = result.byline.length > 0;
      expect(woven || inByline).toBe(true);
      if (inByline) foundReporterSomewhere = true;
    }
    expect(foundReporterSomewhere).toBe(true);
  });

  it("byline is empty when reporterName is missing", () => {
    const ctx = { ...win() };
    delete ctx.reporterName;
    for (let i = 0; i < 10; i++) {
      const result = generateMatchHeadline(ctx);
      expect(result.byline).toBe("");
      expect(result.headline).not.toContain("undefined");
    }
  });

  it("never throws across many random draws for every category, and never leaks 'undefined'", () => {
    for (const { ctx } of cases) {
      for (let i = 0; i < 25; i++) {
        expect(() => generateMatchHeadline(ctx())).not.toThrow();
        const result = generateMatchHeadline(ctx());
        expect(result.headline).not.toContain("undefined");
        expect(result.headline).not.toContain("NaN");
      }
    }
  });

  it("handles a minimal/empty ctx defensively without throwing", () => {
    for (let i = 0; i < 10; i++) {
      expect(() => generateMatchHeadline({})).not.toThrow();
      const result = generateMatchHeadline({});
      expect(typeof result.category).toBe("string");
      expect(result.headline.length).toBeGreaterThan(0);
      expect(result.byline).toBe("");
    }
  });
});

// ---------------------------------------------------------------------------
// record category — seasonUnbeatenRun interpolation
// ---------------------------------------------------------------------------
describe("record headline — seasonUnbeatenRun interpolation", () => {
  it("interpolates the season-scoped run as a real digit, preferring it over a stale career unbeatenRun", () => {
    const ctx = win({ recordUnbeatenRun: true, seasonUnbeatenRun: 8, unbeatenRun: 23 });
    for (let i = 0; i < 20; i++) {
      const result = generateMatchHeadline(ctx);
      expect(result.category).toBe("record");
      expect(result.headline).toContain("8");
      expect(result.headline).not.toContain("23");
      expect(result.headline).not.toContain("undefined");
      expect(result.headline).not.toContain("NaN");
    }
  });

  it("falls back to the career unbeatenRun field when seasonUnbeatenRun isn't provided (back-compat for callers that don't set it)", () => {
    const ctx = win({ recordUnbeatenRun: true, unbeatenRun: 20 });
    const result = generateMatchHeadline(ctx);
    expect(result.category).toBe("record");
    expect(result.headline).toContain("20");
  });
});

// ---------------------------------------------------------------------------
// generateAwardsHeadline
// ---------------------------------------------------------------------------
describe("generateAwardsHeadline", () => {
  it("frames the paper's award as the league's honour, not the paper's own opinion", () => {
    let sawGazetteTemplate = false;
    for (let i = 0; i < 30; i++) {
      const result = generateAwardsHeadline({
        teamName: "City", winnerName: "Rossi", newspaperName: "The Gazette", reporterName: "Sid Marsh",
      });
      expect(result.headline).not.toContain("THEIR PLAYER OF THE SEASON");
      if (result.headline.includes("THE GAZETTE NAMES ROSSI")) {
        sawGazetteTemplate = true;
        expect(result.headline).toBe("THE GAZETTE NAMES ROSSI THE LEAGUE'S PLAYER OF THE SEASON");
      }
    }
    expect(sawGazetteTemplate).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateIdentityHeadline
// ---------------------------------------------------------------------------
describe("generateIdentityHeadline", () => {
  const archetypes = ["counter-attacking", "defensive-wall", "possession"];

  it("returns a headline + byline for every known archetype", () => {
    for (const archetype of archetypes) {
      for (let i = 0; i < 25; i++) {
        const result = generateIdentityHeadline({
          teamName: "City", archetype, newspaperName: "The Gazette", reporterName: "Sid Marsh",
        });
        expect(result).toBeTruthy();
        expect(typeof result.headline).toBe("string");
        expect(result.headline.length).toBeGreaterThan(0);
        expect(result.headline).not.toContain("undefined");
        expect(result.headline).toContain("CITY");
      }
    }
  });

  it("returns null for an unknown archetype", () => {
    expect(generateIdentityHeadline({ teamName: "City", archetype: "tiki-taka", newspaperName: "The Gazette" })).toBeNull();
    expect(generateIdentityHeadline({ teamName: "City", archetype: null })).toBeNull();
  });

  it("omits the byline when no reporterName is set", () => {
    const result = generateIdentityHeadline({ teamName: "City", archetype: "possession", newspaperName: "The Gazette" });
    expect(result.byline).toBe("");
  });

  it("falls back to a generic club name when teamName is missing", () => {
    const result = generateIdentityHeadline({ archetype: "defensive-wall" });
    expect(result.headline).not.toContain("undefined");
    expect(result.headline.length).toBeGreaterThan(0);
  });
});
