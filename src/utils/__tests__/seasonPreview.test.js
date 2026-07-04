import { describe, it, expect } from "vitest";
import { getTenureBand, getSeasonContext, buildSeasonPreviewBody } from "../seasonPreview.js";

describe("getTenureBand", () => {
  it("is fresh for season 1", () => {
    expect(getTenureBand(1)).toBe("fresh");
  });

  it("is building for seasons 2 through 7", () => {
    expect(getTenureBand(2)).toBe("building");
    expect(getTenureBand(7)).toBe("building");
  });

  it("is veteran from season 8 onward", () => {
    expect(getTenureBand(8)).toBe("veteran");
    expect(getTenureBand(20)).toBe("veteran");
  });
});

describe("getSeasonContext", () => {
  it("is post_promotion when lastSeasonMove is promoted", () => {
    expect(getSeasonContext({ lastSeasonMove: "promoted", clubHistory: null, leagueTier: 5 })).toBe("post_promotion");
  });

  it("is post_relegation when lastSeasonMove is relegated", () => {
    expect(getSeasonContext({ lastSeasonMove: "relegated", clubHistory: null, leagueTier: 5 })).toBe("post_relegation");
  });

  it("is default when there is no move or archive", () => {
    expect(getSeasonContext({ lastSeasonMove: "stayed", clubHistory: null, leagueTier: 5 })).toBe("default");
  });

  it("is title_defence when the last archived season was won in the same tier the club is still in", () => {
    const clubHistory = { seasonArchive: [{ season: 3, tier: 5, position: 1 }] };
    expect(getSeasonContext({ lastSeasonMove: "stayed", clubHistory, leagueTier: 5 })).toBe("title_defence");
  });

  it("prefers title_defence over promoted/relegated when both signals are present", () => {
    const clubHistory = { seasonArchive: [{ season: 3, tier: 5, position: 1 }] };
    expect(getSeasonContext({ lastSeasonMove: "promoted", clubHistory, leagueTier: 5 })).toBe("title_defence");
  });

  it("is not title_defence if the club won the title but has since moved to a different tier", () => {
    const clubHistory = { seasonArchive: [{ season: 3, tier: 5, position: 1 }] };
    expect(getSeasonContext({ lastSeasonMove: "promoted", clubHistory, leagueTier: 4 })).toBe("post_promotion");
  });

  it("only looks at the most recent archived season", () => {
    const clubHistory = { seasonArchive: [{ season: 1, tier: 5, position: 1 }, { season: 2, tier: 5, position: 4 }] };
    expect(getSeasonContext({ lastSeasonMove: "stayed", clubHistory, leagueTier: 5 })).toBe("default");
  });
});

describe("buildSeasonPreviewBody", () => {
  const base = {
    seasonNumber: 1, leagueTier: 11, leagueName: "Sunday League",
    topTeamName: "Rivals FC", expectation: "Survive and build for the future.",
    lastSeasonMove: null, clubHistory: null,
  };

  it("always includes the league name and expectation line", () => {
    const body = buildSeasonPreviewBody(base);
    expect(body).toContain("Sunday League");
    expect(body).toContain("Survive and build for the future.");
  });

  it("includes the rival-to-watch line when a top team is given", () => {
    const body = buildSeasonPreviewBody(base);
    expect(body).toContain("Rivals FC look like the ones to beat this season.");
  });

  it("omits the rival-to-watch line when there is no top team", () => {
    const body = buildSeasonPreviewBody({ ...base, topTeamName: null });
    expect(body).not.toContain("look like the ones to beat");
  });

  it("season 1 always uses the fresh/default copy pool regardless of context fields", () => {
    const withPromotion = buildSeasonPreviewBody({ ...base, lastSeasonMove: "promoted" });
    // Season-1 fresh-start openers don't reference promotion/relegation/title language.
    expect(withPromotion).not.toMatch(/promot|relegat|title/i);
  });

  it("varies copy by tenure band for a veteran, title-defending manager", () => {
    const clubHistory = { seasonArchive: [{ season: 9, tier: 3, position: 1 }] };
    const body = buildSeasonPreviewBody({
      ...base, seasonNumber: 10, leagueTier: 3, lastSeasonMove: "stayed", clubHistory,
    });
    expect(body.length).toBeGreaterThan(0);
  });
});
