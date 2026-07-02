import { describe, it, expect } from "vitest";
import { normaliseChoice, getChoiceButtonStyle, getChoiceResult } from "../inboxChoice.js";
import { C } from "../../data/tokens.js";

// Legacy = a choice saved before tone/resultText metadata existed.
const legacyMsg = (type) => ({ id: "m1", type });

describe("normaliseChoice", () => {
  it("returns fully-declared choices untouched", () => {
    const choice = { label: "Accept Trial", value: "accept", tone: "primary", resultText: "You took on the trial." };
    expect(normaliseChoice(legacyMsg("trial_offer"), choice)).toBe(choice);
  });

  it("overlays tone and resultText on a legacy choice by msg.type + value", () => {
    const out = normaliseChoice(legacyMsg("trial_offer"), { label: "Accept Trial", value: "accept" });
    expect(out.tone).toBe("primary");
    expect(out.resultText).toBe("You took on the trial.");
  });

  it("keeps explicit fields and only fills the gaps", () => {
    const out = normaliseChoice(legacyMsg("trial_offer"), { label: "Accept Trial", value: "accept", tone: "danger" });
    expect(out.tone).toBe("danger");
    expect(out.resultText).toBe("You took on the trial.");
  });

  it("leaves unknown message types alone", () => {
    const choice = { label: "OK", value: "ok" };
    expect(normaliseChoice(legacyMsg("some_future_type"), choice)).toBe(choice);
  });

  it("derives poach signings from the label for any choice value", () => {
    const out = normaliseChoice(legacyMsg("poach_event"), { label: "Sign Remy Diaby", value: "1" });
    expect(out.tone).toBe("primary");
    expect(out.resultText).toBe("You signed Remy Diaby.");
  });
});

describe("getChoiceButtonStyle on legacy saves", () => {
  it("renders a legacy accept as primary, not neutral", () => {
    const style = getChoiceButtonStyle(legacyMsg("trial_offer"), { label: "Accept Trial", value: "accept" });
    expect(style.border).toBe(C.green);
  });

  it("renders a legacy decline as neutral, not danger", () => {
    const style = getChoiceButtonStyle(legacyMsg("trial_offer"), { label: "Decline", value: "decline" });
    expect(style.border).toBe(C.textMuted);
  });

  it("renders every legacy poach choice as primary — no first-option bias", () => {
    const msg = legacyMsg("poach_event");
    for (const value of ["0", "1", "2"]) {
      const style = getChoiceButtonStyle(msg, { label: `Sign Player ${value}`, value });
      expect(style.border).toBe(C.green);
    }
  });
});

describe("getChoiceResult on legacy saves", () => {
  it("shows a proper result line instead of echoing the button label", () => {
    const { color, icon, text } = getChoiceResult(legacyMsg("trial_offer"), { label: "Accept Trial", value: "accept" });
    expect(text).toBe("You took on the trial.");
    expect(icon).toBe("✓");
    expect(color).toBe(C.green);
  });

  it("gives legacy refusals neutral copy with no tick or cross", () => {
    const { icon, color, text } = getChoiceResult(legacyMsg("free_agent_offer"), { label: "Pass", value: "decline" });
    expect(text).toBe("You passed on the deal.");
    expect(icon).toBeNull();
    expect(color).toBe(C.textMuted);
  });

  it("falls back to the label only for types outside the fallback table", () => {
    const { text } = getChoiceResult(legacyMsg("some_future_type"), { label: "Do The Thing", value: "x" });
    expect(text).toBe("Do The Thing");
  });

  it("still honours declared metadata over legacy defaults", () => {
    const { text } = getChoiceResult(legacyMsg("trial_offer"), {
      label: "Accept Trial", value: "accept", tone: "primary", resultText: "Bespoke copy.",
    });
    expect(text).toBe("Bespoke copy.");
  });
});
