import { describe, it, expect } from "vitest";
import { MSG } from "../messages.js";

describe("transfer window beat messages", () => {
  it("transferWindowOpen produces a distinct, non-empty message", () => {
    const msg = MSG.transferWindowOpen();
    expect(msg.title).toBeTruthy();
    expect(msg.body).toMatch(/transfer window is open/i);
    expect(msg.id).toBeTruthy();
  });

  it("transferWindowFinalWeek produces a distinct, non-empty message", () => {
    const msg = MSG.transferWindowFinalWeek();
    expect(msg.title).toBeTruthy();
    expect(msg.body).toMatch(/deadline week/i);
    expect(msg.id).toBeTruthy();
  });

  it("transferWindowClosed produces a distinct, non-empty message", () => {
    const msg = MSG.transferWindowClosed();
    expect(msg.title).toBeTruthy();
    expect(msg.body).toMatch(/closed/i);
    expect(msg.id).toBeTruthy();
  });
});
