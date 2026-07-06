import { describe, it, expect } from "vitest";
import { getNextOnboardingDripMessage } from "../onboardingDrip.js";

const baseState = () => ({
  onboardingDripSuppressed: false,
  seasonNumber: 1,
  matchweekIndex: 0,
  calendarIndex: 0,
  unlockedAchievements: new Set(),
  inboxMessages: [],
  seasonCalendar: [],
});

describe("getNextOnboardingDripMessage — gating", () => {
  it("a fresh new-career state (nothing suppressed, season 1) is eligible for the drip", () => {
    const msg = getNextOnboardingDripMessage({ ...baseState(), matchweekIndex: 1 });
    expect(msg).toBeTruthy();
    expect(msg.id).toBe("msg_onboarding_matchday");
  });

  it("an opted-out career sees no drip messages at all, no matter what's true", () => {
    const state = {
      ...baseState(),
      onboardingDripSuppressed: true,
      matchweekIndex: 5,
      calendarIndex: 10,
      unlockedAchievements: new Set(["first_win"]),
    };
    expect(getNextOnboardingDripMessage(state)).toBeNull();
  });

  it("an old save (suppressed defaulted true by the load path) sees none", () => {
    // Mirrors what useSaveGame's load path does for a save predating this
    // field: `s.onboardingDripSuppressed ?? true`.
    const loaded = undefined;
    const state = { ...baseState(), onboardingDripSuppressed: loaded ?? true, matchweekIndex: 3 };
    expect(getNextOnboardingDripMessage(state)).toBeNull();
  });

  it("never fires past the career's first season", () => {
    const state = { ...baseState(), seasonNumber: 2, matchweekIndex: 1 };
    expect(getNextOnboardingDripMessage(state)).toBeNull();
  });

  it("returns null when nothing is due yet", () => {
    expect(getNextOnboardingDripMessage(baseState())).toBeNull();
  });
});

describe("getNextOnboardingDripMessage — per-step triggers", () => {
  it("fires the matchday step once at least one matchweek has been played", () => {
    const msg = getNextOnboardingDripMessage({ ...baseState(), matchweekIndex: 1 });
    expect(msg.id).toBe("msg_onboarding_matchday");
  });

  it("skips a step already present in the inbox and moves to the next due one", () => {
    const state = {
      ...baseState(),
      matchweekIndex: 1,
      calendarIndex: 2,
      inboxMessages: [{ id: "msg_onboarding_matchday" }],
    };
    const msg = getNextOnboardingDripMessage(state);
    expect(msg.id).toBe("msg_onboarding_transfers");
  });

  it("fires the cig packs step only after the first achievement unlocks", () => {
    const notYet = getNextOnboardingDripMessage({
      ...baseState(),
      matchweekIndex: 1, calendarIndex: 2,
      inboxMessages: [{ id: "msg_onboarding_matchday" }, { id: "msg_onboarding_transfers" }],
    });
    expect(notYet).toBeNull();

    const now = getNextOnboardingDripMessage({
      ...baseState(),
      matchweekIndex: 1, calendarIndex: 2,
      unlockedAchievements: new Set(["first_win"]),
      inboxMessages: [{ id: "msg_onboarding_matchday" }, { id: "msg_onboarding_transfers" }],
    });
    expect(now.id).toBe("msg_onboarding_cigpacks");
  });

  it("fires the club mood step from week 5 (calendarIndex 4) on", () => {
    const state = {
      ...baseState(),
      matchweekIndex: 1, calendarIndex: 4,
      unlockedAchievements: new Set(["first_win"]),
      inboxMessages: [
        { id: "msg_onboarding_matchday" }, { id: "msg_onboarding_transfers" }, { id: "msg_onboarding_cigpacks" },
      ],
    };
    expect(getNextOnboardingDripMessage(state).id).toBe("msg_onboarding_club_mood");
  });

  it("fires the cup step once the calendar's first cup round is imminent", () => {
    const seasonCalendar = [
      { type: "league", leagueMD: 0 }, { type: "league", leagueMD: 1 },
      { type: "league", leagueMD: 2 }, { type: "league", leagueMD: 3 },
      { type: "league", leagueMD: 4 }, { type: "cup", cupRound: 0 },
    ];
    const tooEarly = getNextOnboardingDripMessage({
      ...baseState(), seasonCalendar, calendarIndex: 3,
      inboxMessages: [
        { id: "msg_onboarding_matchday" }, { id: "msg_onboarding_transfers" },
        { id: "msg_onboarding_cigpacks" }, { id: "msg_onboarding_club_mood" },
      ],
    });
    expect(tooEarly).toBeNull();

    const dueNow = getNextOnboardingDripMessage({
      ...baseState(), seasonCalendar, calendarIndex: 4,
      inboxMessages: [
        { id: "msg_onboarding_matchday" }, { id: "msg_onboarding_transfers" },
        { id: "msg_onboarding_cigpacks" }, { id: "msg_onboarding_club_mood" },
      ],
    });
    expect(dueNow.id).toBe("msg_onboarding_cup");
  });

  it("posts at most one drip message per call, even when several steps are ready", () => {
    const state = {
      ...baseState(),
      matchweekIndex: 1, calendarIndex: 5,
      unlockedAchievements: new Set(["first_win"]),
    };
    const msg = getNextOnboardingDripMessage(state);
    // Only the first unsent, ready step in priority order comes back.
    expect(msg.id).toBe("msg_onboarding_matchday");
  });

  it("returns null once every step has already been sent", () => {
    const state = {
      ...baseState(),
      matchweekIndex: 1, calendarIndex: 5,
      unlockedAchievements: new Set(["first_win"]),
      inboxMessages: [
        { id: "msg_onboarding_matchday" }, { id: "msg_onboarding_transfers" },
        { id: "msg_onboarding_cigpacks" }, { id: "msg_onboarding_club_mood" },
        { id: "msg_onboarding_cup" },
      ],
    };
    expect(getNextOnboardingDripMessage(state)).toBeNull();
  });
});
