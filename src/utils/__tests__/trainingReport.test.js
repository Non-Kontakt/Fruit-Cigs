import { describe, it, expect } from "vitest";
import { buildTrainingItems, recordTrainingReveal, recordTrainingTicket } from "../trainingReport.js";

const report = () => ({
  reportId: "report-one",
  improvements: [{ playerName: "Test", attr: "pace", oldVal: 5, newVal: 6 }],
  injuries: [{ playerName: "Other", injury: "Knock" }],
  cappedArcTickets: [{ arcName: "First", choices: ["boost", "rewind"] }, { arcName: "Second", choices: ["boost"] }],
});

describe("durable training report claims", () => {
  it("keeps item identity across save/reload and presentation sorting", () => {
    const items = buildTrainingItems(report());
    expect(buildTrainingItems(JSON.parse(JSON.stringify(report())))).toEqual(items);
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
  });
  it("counts a revealed item once even after reload", () => {
    const key = buildTrainingItems(report())[0].id;
    const first = recordTrainingReveal(report(), key);
    const loaded = JSON.parse(JSON.stringify(first));
    expect(recordTrainingReveal(loaded, key)).toBe(loaded);
    expect(first.revealedItems).toEqual([key]);
  });
  it("cannot claim a ticket twice or change the choice after reload", () => {
    const key = buildTrainingItems(report()).find(i => i.type === "capped_arc_ticket").id;
    const claimed = recordTrainingTicket(report(), key, "boost");
    const loaded = JSON.parse(JSON.stringify(claimed));
    expect(recordTrainingTicket(loaded, key, "rewind")).toBe(loaded);
    expect(loaded.pickedTickets[key]).toBe("boost");
  });
  it("keeps separate overflow rewards distinct", () => {
    const keys = buildTrainingItems(report()).filter(i => i.type === "capped_arc_ticket").map(i => i.id);
    const first = recordTrainingTicket(report(), keys[0], "boost");
    const second = recordTrainingTicket(first, keys[1], "boost");
    expect(Object.keys(second.pickedTickets)).toEqual(keys);
  });
  it("rejects missing items, invalid choices and late callbacks", () => {
    const r = report();
    expect(recordTrainingReveal(r, "missing")).toBe(r);
    expect(recordTrainingTicket(r, "capped_arc_ticket:2", "not-offered")).toBe(r);
    expect(recordTrainingReveal(null, "gain:0")).toBeNull();
    expect(recordTrainingTicket(null, "anything", "boost")).toBeNull();
  });
});
