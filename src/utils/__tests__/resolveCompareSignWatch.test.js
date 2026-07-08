import { describe, it, expect } from "vitest";
import { resolveCompareSignWatch } from "../transfer.js";

describe("resolveCompareSignWatch — Upgrade Confirmed watch resolution", () => {
  it("returns null when there's no prior comparison", () => {
    const received = [{ id: "target1", name: "New Signing" }];
    expect(resolveCompareSignWatch(null, received)).toBeNull();
  });

  it("returns null when nothing was received", () => {
    const lastCompared = { targetId: "target1", targetName: "New Signing", starterName: "Old Starter" };
    expect(resolveCompareSignWatch(lastCompared, [])).toBeNull();
    expect(resolveCompareSignWatch(lastCompared, null)).toBeNull();
  });

  it("returns null when the signed player doesn't match the compared target", () => {
    const lastCompared = { targetId: "target1", targetName: "New Signing", starterName: "Old Starter" };
    const received = [{ id: "someoneElse", name: "Someone Else" }];
    expect(resolveCompareSignWatch(lastCompared, received)).toBeNull();
  });

  it("builds the watch when the signed player matches the compared target", () => {
    const lastCompared = { targetId: "target1", targetName: "New Signing", starterName: "Old Starter" };
    const received = [{ id: "target1", name: "New Signing" }];
    expect(resolveCompareSignWatch(lastCompared, received)).toEqual({
      signedId: "target1", signedName: "New Signing", replacedName: "Old Starter",
    });
  });

  it("finds the compared target among multiple received players", () => {
    const lastCompared = { targetId: "target1", targetName: "New Signing", starterName: "Old Starter" };
    const received = [{ id: "other", name: "Other Player" }, { id: "target1", name: "New Signing" }];
    expect(resolveCompareSignWatch(lastCompared, received)?.signedId).toBe("target1");
  });

  it("handles a comparison with no natural starter to replace (fresh squad)", () => {
    const lastCompared = { targetId: "target1", targetName: "New Signing", starterName: null };
    const received = [{ id: "target1", name: "New Signing" }];
    expect(resolveCompareSignWatch(lastCompared, received)).toEqual({
      signedId: "target1", signedName: "New Signing", replacedName: null,
    });
  });
});
