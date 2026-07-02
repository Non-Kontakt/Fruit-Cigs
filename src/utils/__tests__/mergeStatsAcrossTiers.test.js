import { describe, it, expect } from "vitest";
import { mergeStatsAcrossTiers } from "../competitionStats.js";

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
});
