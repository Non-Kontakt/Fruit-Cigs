import { describe, it, expect } from "vitest";
import { getPackSurfaceBackground, makeTearClipPath } from "../packCeremony.js";

describe("getPackSurfaceBackground", () => {
  it("bakes the given colour into all three background layers", () => {
    const bg = getPackSurfaceBackground("#ef4444");
    expect(bg).toContain("color-mix(in srgb, #ef4444 78%, black)");
    expect(bg).toContain("color-mix(in srgb, #ef4444 62%, black)");
    expect(bg).toContain("color-mix(in srgb, #ef4444 70%, black)");
  });
});

describe("makeTearClipPath", () => {
  it("reproduces the pack ceremony's exact tear line at 2% wide / 25% deep", () => {
    const ORIGINAL_TEAR_CLIP =
      "polygon(0% 100%, 0% 75%, 2% 75%, 2% 100%, 5% 100%, 5% 75%, 7% 75%, 7% 100%, 10% 100%, 10% 75%, 12% 75%, 12% 100%, 15% 100%, 15% 75%, 17% 75%, 17% 100%, 20% 100%, 20% 75%, 22% 75%, 22% 100%, 25% 100%, 25% 75%, 27% 75%, 27% 100%, 30% 100%, 30% 75%, 32% 75%, 32% 100%, 35% 100%, 35% 75%, 37% 75%, 37% 100%, 40% 100%, 40% 75%, 42% 75%, 42% 100%, 45% 100%, 45% 75%, 47% 75%, 47% 100%, 50% 100%, 50% 75%, 52% 75%, 52% 100%, 55% 100%, 55% 75%, 57% 75%, 57% 100%, 60% 100%, 60% 75%, 62% 75%, 62% 100%, 65% 100%, 65% 75%, 67% 75%, 67% 100%, 70% 100%, 70% 75%, 72% 75%, 72% 100%, 75% 100%, 75% 75%, 77% 75%, 77% 100%, 80% 100%, 80% 75%, 82% 75%, 82% 100%, 85% 100%, 85% 75%, 87% 75%, 87% 100%, 90% 100%, 90% 75%, 92% 75%, 92% 100%, 95% 100%, 95% 75%, 97% 75%, 97% 100%, 100% 100%)";
    expect(makeTearClipPath(2, 25)).toBe(ORIGINAL_TEAR_CLIP);
  });

  it("returns a polygon() clip-path", () => {
    expect(makeTearClipPath(2, 25)).toMatch(/^polygon\(.*\)$/);
  });

  it("starts and ends at the box's bottom corners", () => {
    const path = makeTearClipPath(2, 25);
    const points = path.slice("polygon(".length, -1).split(", ");
    expect(points[0]).toBe("0% 100%");
    expect(points[points.length - 1]).toBe("100% 100%");
  });

  it("produces the correct point count for a given tooth width (1 start point + 4 per tooth)", () => {
    // toothWidthPct 4 -> pitch 10 -> 10 teeth spanning 0-100%.
    const path = makeTearClipPath(4, 25);
    const points = path.slice("polygon(".length, -1).split(", ");
    expect(points.length).toBe(1 + 4 * 10);
  });

  it("cuts up by the given depth from the bottom edge", () => {
    const path = makeTearClipPath(4, 10);
    expect(path).toContain("90%"); // 100 - 10
    expect(path).not.toContain("75%");
  });
});
