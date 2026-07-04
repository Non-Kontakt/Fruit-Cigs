import { describe, it, expect } from "vitest";
import { mergeStatsAcrossTiers, resolveDisplayIdentity } from "../competitionStats.js";

// Test fixtures ---------------------------------------------------------------

function tierBlob(players) {
  return { players, processedMatches: {} };
}

describe("mergeStatsAcrossTiers", () => {
  it("sums the same player key across three tier blobs", () => {
    const statsByTier = {
      5: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                position: "ST", goals: 3, assists: 1, yellows: 0, reds: 0 },
      }),
      6: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 1, teamName: "Rovers",
                position: "ST", goals: 2, assists: 2, yellows: 1, reds: 0 },
      }),
      7: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 2, teamName: "Athletic",
                position: "ST", goals: 5, assists: 0, yellows: 0, reds: 1 },
      }),
    };
    const merged = mergeStatsAcrossTiers(statsByTier);
    expect(merged.players["p1"].goals).toBe(10);
    expect(merged.players["p1"].assists).toBe(3);
    expect(merged.players["p1"].yellows).toBe(1);
    expect(merged.players["p1"].reds).toBe(1);
  });

  it("takes identity fields from the entry with the most goals", () => {
    const statsByTier = {
      5: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                position: "ST", goals: 2, assists: 0, yellows: 0, reds: 0 },
      }),
      6: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 1, teamName: "Rovers",
                position: "CM", goals: 9, assists: 0, yellows: 0, reds: 0 },
      }),
    };
    const merged = mergeStatsAcrossTiers(statsByTier);
    expect(merged.players["p1"].teamName).toBe("Rovers");
    expect(merged.players["p1"].position).toBe("CM");
    expect(merged.players["p1"].goals).toBe(11);
  });

  it("compares identity spell-vs-spell, not spell-vs-accumulated-sum", () => {
    // Spells of 3, 2, 4: the 4-goal spell must win identity even though the
    // running total (3+2=5) already exceeds it by the time it merges.
    const statsByTier = {
      5: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                position: "ST", goals: 3, assists: 0, yellows: 0, reds: 0 },
      }),
      6: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 1, teamName: "Rovers",
                position: "CM", goals: 2, assists: 0, yellows: 0, reds: 0 },
      }),
      7: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 2, teamName: "Athletic",
                position: "AM", goals: 4, assists: 0, yellows: 0, reds: 0 },
      }),
    };
    const merged = mergeStatsAcrossTiers(statsByTier);
    expect(merged.players["p1"].teamName).toBe("Athletic");
    expect(merged.players["p1"].position).toBe("AM");
    expect(merged.players["p1"].goals).toBe(9);
  });

  it("passes through players present in only one tier", () => {
    const statsByTier = {
      5: tierBlob({
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                goals: 4, assists: 1, yellows: 0, reds: 0 },
      }),
      6: tierBlob({
        "p2": { key: "p2", playerId: "p2", name: "Bob", teamId: 1, teamName: "Rovers",
                goals: 1, assists: 0, yellows: 2, reds: 0 },
      }),
    };
    const merged = mergeStatsAcrossTiers(statsByTier);
    expect(merged.players["p1"].goals).toBe(4);
    expect(merged.players["p2"].yellows).toBe(2);
  });

  it("returns empty players for empty or missing input", () => {
    expect(mergeStatsAcrossTiers({})).toEqual({ players: {} });
    expect(mergeStatsAcrossTiers(null)).toEqual({ players: {} });
    expect(mergeStatsAcrossTiers(undefined)).toEqual({ players: {} });
    expect(mergeStatsAcrossTiers({ 5: tierBlob({}), 6: null })).toEqual({ players: {} });
  });

  describe("currentSeasonPlayers signal", () => {
    it("a player active this season shows their current club, even when a historical spell scored more", () => {
      const statsByTier = {
        5: tierBlob({
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                  position: "ST", goals: 8, assists: 0, yellows: 0, reds: 0 },
        }),
        6: tierBlob({
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 1, teamName: "Rovers",
                  position: "ST", goals: 1, assists: 0, yellows: 0, reds: 0 },
        }),
      };
      // Current season entry (goals not summed here — that's the caller's job;
      // this only signals identity).
      const currentSeasonPlayers = {
        players: {
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 9, teamName: "Newtown",
                  position: "CM", goals: 1, assists: 0, yellows: 0, reds: 0 },
        },
      };
      const merged = mergeStatsAcrossTiers(statsByTier, currentSeasonPlayers);
      expect(merged.players["p1"].teamName).toBe("Newtown");
      expect(merged.players["p1"].teamId).toBe(9);
      expect(merged.players["p1"].position).toBe("CM");
      // Numeric totals are unaffected by the identity signal — still the
      // sum of the historical (statsByTier) entries only.
      expect(merged.players["p1"].goals).toBe(9);
    });

    it("also wins identity on first encounter (single historical tier)", () => {
      const statsByTier = {
        5: tierBlob({
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                  position: "ST", goals: 4, assists: 0, yellows: 0, reds: 0 },
        }),
      };
      const currentSeasonPlayers = {
        "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 9, teamName: "Newtown",
                position: "CM", goals: 2, assists: 0, yellows: 0, reds: 0 },
      };
      const merged = mergeStatsAcrossTiers(statsByTier, currentSeasonPlayers);
      expect(merged.players["p1"].teamName).toBe("Newtown");
      expect(merged.players["p1"].goals).toBe(4);
    });

    it("a player with no current-season entry still shows their best historical spell", () => {
      const statsByTier = {
        5: tierBlob({
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                  position: "ST", goals: 2, assists: 0, yellows: 0, reds: 0 },
        }),
        6: tierBlob({
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 1, teamName: "Rovers",
                  position: "CM", goals: 9, assists: 0, yellows: 0, reds: 0 },
        }),
      };
      // currentSeasonPlayers is supplied but doesn't include p1 — inactive
      // this season, so best-spell identity applies as before.
      const currentSeasonPlayers = { players: { "p2": { key: "p2", name: "Bob", goals: 3 } } };
      const merged = mergeStatsAcrossTiers(statsByTier, currentSeasonPlayers);
      expect(merged.players["p1"].teamName).toBe("Rovers");
      expect(merged.players["p1"].goals).toBe(11);
    });

    it("omitting currentSeasonPlayers entirely preserves the old best-spell-only behavior", () => {
      const statsByTier = {
        5: tierBlob({
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 0, teamName: "City",
                  goals: 3, assists: 0, yellows: 0, reds: 0 },
        }),
        6: tierBlob({
          "p1": { key: "p1", playerId: "p1", name: "Alice", teamId: 1, teamName: "Rovers",
                  goals: 9, assists: 0, yellows: 0, reds: 0 },
        }),
      };
      expect(mergeStatsAcrossTiers(statsByTier).players["p1"].teamName).toBe("Rovers");
    });
  });
});

describe("resolveDisplayIdentity", () => {
  it("prefers the current entry's fields when a current entry is given", () => {
    const historical = { name: "Alice", teamId: 0, teamName: "City", position: "ST" };
    const current = { name: "Alice", teamId: 9, teamName: "Newtown", position: "CM" };
    expect(resolveDisplayIdentity(historical, current)).toEqual({
      name: "Alice", teamId: 9, teamName: "Newtown", position: "CM",
    });
  });

  it("falls back to historical fields when the current entry is missing a field", () => {
    const historical = { name: "Alice", teamId: 0, teamName: "City", position: "ST" };
    const current = { name: "", teamId: null, teamName: "", position: null };
    expect(resolveDisplayIdentity(historical, current)).toEqual({
      name: "Alice", teamId: 0, teamName: "City", position: "ST",
    });
  });

  it("returns historical fields unchanged when there is no current entry", () => {
    const historical = { name: "Alice", teamId: 0, teamName: "City", position: "ST" };
    expect(resolveDisplayIdentity(historical, null)).toEqual(historical);
  });

  it("returns empty identity when neither entry is given", () => {
    expect(resolveDisplayIdentity(null, null)).toEqual({
      name: "", teamId: null, teamName: "", position: null,
    });
  });
});
