import { test, expect } from "@playwright/test";
import path from "node:path";

const SHOT_DIR = path.resolve("qa/.artifacts/screenshots");
const shot = (page, project, name) =>
  page.screenshot({ path: path.join(SHOT_DIR, project, `${name}.png`), fullPage: true });

// Boot the REAL app (index.html), not the component harness. These flows
// exercise the actual store → component wiring and the save serialize/hydrate
// round-trip — the integration coverage the isolated component harness can't
// give.

test.describe("full-app flows", () => {
  test("fresh new game wires up league + inbox", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });

    // Bootstrap a game via the dev hook (skips the new-game click-through).
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));

    // The init effect cascades league / cup / calendar / inbox off `teamName`.
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    const state = await page.evaluate(() => {
      const s = window.__fc.getState();
      return {
        teams: s.league?.teams?.length ?? 0,
        inbox: s.inboxMessages?.length ?? 0,
        calendar: s.seasonCalendar?.length ?? 0,
        tier: s.leagueTier,
      };
    });

    // Store-level assertions: the real init produced a coherent world.
    expect(state.teams, "league should have teams").toBeGreaterThan(1);
    expect(state.inbox, "inbox should be seeded").toBeGreaterThanOrEqual(3);
    expect(state.calendar, "season calendar should be built").toBeGreaterThan(0);

    await page.waitForTimeout(400);
    await shot(page, testInfo.project.name, "flow-fresh-newgame");
  });

  test("squad page renders the full player list", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Navigate to the squad page via the real nav, like a player would.
    await page.getByText("SQUAD", { exact: false }).first().click();
    await page.waitForTimeout(400);

    // Auto-assign a lineup so the list shows the real XI/bench/reserve mix
    // a player actually manages, not a fresh unassigned roster.
    await page.getByText("ASST XI", { exact: false }).first().click();
    await page.waitForFunction(() => (window.__fc.getState().startingXI || []).length === 11, null, { timeout: 5_000 });
    await page.waitForTimeout(300);

    // Sanity: the roster actually rendered (a squad is 16+ players).
    const squadSize = await page.evaluate(() => window.__fc.getState().squad.length);
    expect(squadSize, "squad should be generated").toBeGreaterThanOrEqual(16);

    await shot(page, testInfo.project.name, "flow-squad-page");
  });

  test("squad page tags homegrown players with an HG badge", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    await page.getByText("SQUAD", { exact: false }).first().click();
    await page.waitForTimeout(400);

    // Sanity check first: no HG badge on a fresh, un-flagged squad.
    const countHgBadges = () => page.getByText("HG", { exact: true }).count();
    expect(await countHgBadges(), "no HG badge before any player is flagged").toBe(0);

    // Mark the first squad player as a youth-intake graduate via the dev hook
    // — no need to play through a full summer break to reach this state.
    await page.evaluate(() => {
      const s = window.__fc.getState();
      const squad = s.squad.map((p, i) => (i === 0 ? { ...p, isYouthIntake: true } : p));
      window.__fc.setState({ squad });
    });
    await page.waitForTimeout(300);

    await expect(page.getByText("HG", { exact: true }).first()).toBeVisible();
    expect(await countHgBadges(), "exactly one HG badge for the one flagged player").toBe(1);

    await shot(page, testInfo.project.name, "flow-squad-homegrown-badge");
  });

  test("mobile: section headers move the selected player", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "tap-to-move is a mobile interaction");
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });
    // newGame rolls squads of 16-18; at exactly 16 (11 XI + 5 bench) there
    // are zero reserves, so the RESERVES header this test taps never renders
    // (~1-in-4 flake). Pad the squad to 18 deterministically so the reserves
    // section always exists, keeping the rest of the flow real.
    await page.evaluate(() => {
      const s = window.__fc.getState();
      const attrs = (v) => ({ pace: v, shooting: v, passing: v, defending: v, physical: v, technique: v, mental: v });
      const pad = [];
      for (let i = s.squad.length; i < 18; i++) {
        pad.push({
          id: `qa-reserve-${i}`, name: `Quentin Zzeserve${i}`, position: "CM", age: 24,
          attrs: attrs(8), potential: 12, statProgress: {}, training: null, gains: {},
          tags: [], injury: null, injuryHistory: {}, history: [attrs(8)],
        });
      }
      if (pad.length) window.__fc.setState({ squad: [...s.squad, ...pad] });
    });
    await page.getByText("SQUAD", { exact: false }).first().click();
    await page.getByText("ASST XI", { exact: false }).first().click();
    await page.waitForFunction(() => (window.__fc.getState().startingXI || []).length === 11, null, { timeout: 5_000 });
    await page.waitForTimeout(300);

    // Pick a bench player whose surname is unique in the squad — mobile rows
    // shorten first names, so the surname is the reliable tap target.
    const target = await page.evaluate(() => {
      const s = window.__fc.getState();
      const surname = (n) => n.split(" ").slice(1).join(" ");
      for (const id of s.bench) {
        const p = s.squad.find(pl => pl.id === id);
        if (p && s.squad.filter(o => surname(o.name) === surname(p.name)).length === 1) {
          return { id: p.id, surname: surname(p.name) };
        }
      }
      return null;
    });
    expect(target, "a bench player with a unique surname should exist").not.toBeNull();

    // Select them, then tap the RESERVES header — the move the selection
    // banner promises.
    await page.getByText(target.surname, { exact: false }).first().click();
    await page.waitForTimeout(200);
    await page.getByText("RESERVES", { exact: true }).first().click();
    await page.waitForTimeout(300);

    const after = await page.evaluate((id) => {
      const s = window.__fc.getState();
      return { onBench: s.bench.includes(id), inXI: s.startingXI.includes(id) };
    }, target.id);
    expect(after.onBench, "player should have left the bench").toBe(false);
    expect(after.inXI, "player should not have joined the XI").toBe(false);
  });

  test("save round-trips through localStorage and resumes", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Capture the live save and seed a profile + slot into storage, exactly
    // like the game's own save/profile format.
    await page.evaluate(() => {
      const save = window.__fc.dumpSave();
      const id = "qa-profile";
      const now = new Date(0).toISOString();
      localStorage.setItem("jfg-profiles", JSON.stringify([{ id, name: "QA", createdAt: now }]));
      localStorage.setItem(`jfg-profile-${id}`, JSON.stringify({
        id, name: "QA", createdAt: now, schemaVersion: 1,
        unlockedAchievements: [], achievementDates: {}, ironmanCareers: 0,
        ironmanBest: null, lastIronmanVersion: 0, museum: [],
      }));
      localStorage.setItem(`jfg-save-${id}-1`, JSON.stringify(save));
    });

    // Reload into a cold app that must rediscover the seeded save.
    await page.reload();
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });

    // Profile is discoverable on the select screen.
    await expect(page.getByText("QA", { exact: true }).first()).toBeVisible({ timeout: 5_000 });
    await page.getByText("QA", { exact: true }).first().click();

    // scanProfileSlots parsed the injected save — its teamName shows on the slot.
    await expect(page.getByText("Red Lion FC", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
    await shot(page, testInfo.project.name, "flow-resume-slot");

    // Resume it and confirm the store hydrated from the injected blob.
    await page.getByText("Red Lion FC", { exact: false }).first().click();
    await page.waitForFunction(() => window.__fc.getState().teamName === "Red Lion FC", null, { timeout: 10_000 });
    const resumed = await page.evaluate(() => window.__fc.getState().league != null);
    expect(resumed, "league should hydrate from the injected save").toBe(true);
  });

  test("mobile: selecting a squad player does not shift the list", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile-only");

    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Navigate to the squad page via the real nav, like a player would.
    await page.getByText("SQUAD", { exact: false }).first().click();
    await page.waitForTimeout(400);

    // Names are shortened on mobile (displayName), so match on the surname —
    // it survives the abbreviation either way.
    const surname = await page.evaluate(() => {
      const name = window.__fc.getState().squad[5].name;
      return name.split(" ").pop();
    });

    // Exclude the "selected" banner, which echoes the same player's full
    // name once tapped and would otherwise steal the .first() match.
    const row = page.getByText(surname, { exact: false }).filter({ hasNotText: "selected" }).first();
    await expect(row).toBeVisible({ timeout: 5_000 });

    const before = await row.boundingBox();
    const scrollBefore = await page.evaluate(() => window.scrollY);

    await row.click();
    await page.waitForTimeout(300);

    const after = await row.boundingBox();
    const scrollAfter = await page.evaluate(() => window.scrollY);

    expect(Math.abs(after.y - before.y), "row should not shift vertically on selection").toBeLessThan(2);
    expect(Math.abs(scrollAfter - scrollBefore), "page should not scroll on selection").toBeLessThan(2);
  });

  test("dashboard renders the latest back-page headline", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Leave state the way processMatchDone would: one played result plus the
    // generated back page for it. The masthead should print both.
    await page.evaluate(() => {
      const s = window.__fc.getState();
      window.__fc.setState({
        calendarResults: { 0: { playerGoals: 3, oppGoals: 0, won: true, draw: false } },
        latestHeadline: {
          category: "hattrick",
          headline: "HAT-TRICK HERO: ROBINSON FIRES RED LION FC PAST DOG & DUCK 3-0",
          byline: "— Trevor Ash reports",
          season: s.seasonNumber,
          calendarIndex: 0,
        },
      });
    });
    await page.waitForTimeout(300);

    await expect(page.getByText("HAT-TRICK HERO", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Trevor Ash", { exact: false }).first()).toBeVisible();
    await shot(page, testInfo.project.name, "flow-dashboard-headline");

    // Staleness guard: a newer result lands without a matching headline (a
    // save loaded mid-season before headline generation existed, say). The
    // old back page must NOT stay up — the masthead falls back to copy for
    // the newest result.
    await page.evaluate(() => {
      const s = window.__fc.getState();
      window.__fc.setState({
        calendarResults: {
          ...s.calendarResults,
          1: { playerGoals: 0, oppGoals: 2, won: false, draw: false },
        },
      });
    });
    await page.waitForTimeout(300);
    await expect(page.getByText("HAT-TRICK HERO", { exact: false })).toHaveCount(0);
  });

  test("dashboard renders a bylined cup headline (not the inline fallback)", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Leave state the way settleCupHeadline() (App.jsx) would after a cup
    // final win: a played result plus a bylined cup_final_win back page.
    // Cup results used to only get Dashboard's bylineless inline fallback
    // copy — this proves the real generator's output renders instead.
    await page.evaluate(() => {
      const s = window.__fc.getState();
      window.__fc.setState({
        calendarResults: { 0: { playerGoals: 2, oppGoals: 1, won: true, draw: false } },
        latestHeadline: {
          category: "cup_final_win",
          headline: "RED LION FC LIFT THE CUP! 2-1 OVER DOG & DUCK IN THE FINAL",
          byline: "— Trevor Ash reports",
          season: s.seasonNumber,
          calendarIndex: 0,
        },
      });
    });
    await page.waitForTimeout(300);

    await expect(page.getByText("LIFT THE CUP", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Trevor Ash", { exact: false }).first()).toBeVisible();
    await shot(page, testInfo.project.name, "flow-dashboard-cup-headline");
  });

  test("dashboard: FANS mood expands to show recent sentiment reasons", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    await page.evaluate(() => {
      const s = window.__fc.getState();
      window.__fc.setState({
        sentimentLog: [
          { delta: 4, reason: "Beat Yeralden 3-0", week: 14, season: s.seasonNumber },
        ],
      });
    });
    await page.waitForTimeout(200);

    // The reason is hidden until the FANS row is expanded.
    await expect(page.getByText("Beat Yeralden 3-0", { exact: false })).toHaveCount(0);
    await page.getByText("FANS", { exact: false }).first().click();
    await expect(page.getByText("Beat Yeralden 3-0", { exact: false })).toBeVisible();
    await shot(page, testInfo.project.name, "flow-sentiment-log-expanded");
  });

  test("achievement index lists the collection ledger", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Navigate to the achievement cabinet via the real nav, then to CIG PACKS
    // (the default tab) and toggle into the list view — INDEX is no longer
    // its own cabinet tab, it's a view inside CIG PACKS.
    await page.getByText("CORNER SHOP", { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByText("CIG PACKS", { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Index list view" }).click();
    await page.waitForTimeout(300);

    await expect(page.getByText("INDEX ·", { exact: false }).first()).toBeVisible({ timeout: 5_000 });

    // Sealed titles are visible now: an uncollected card behind a still-sealed
    // pack lists its real name and pack chip, with the description swapped
    // for a "— sealed —" tease rather than being omitted entirely.
    const sealedRow = page.locator('[data-testid="cig-index-row"][data-kind="sealed"]').first();
    await expect(sealedRow).toBeVisible();
    await expect(sealedRow.getByText("— sealed —")).toBeVisible();
    const sealedName = (await sealedRow.getByTestId("cig-index-row-name").innerText()).trim();
    expect(sealedName.length, "sealed row should show a real achievement name").toBeGreaterThan(0);
    // The old anonymised phrasing must be gone.
    await expect(page.getByText("Hidden card", { exact: false })).toHaveCount(0);

    // Clicking any row opens the card modal.
    await page.locator('[data-testid="cig-index-row"]').first().click();
    await expect(page.getByTestId("cig-card-modal")).toBeVisible({ timeout: 5_000 });

    await shot(page, testInfo.project.name, "flow-achievement-index");
  });

  test("index RECENT sort respects unlock chronology within a week", async ({ page }) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Three cards earned in the SAME week, in a deliberate order that differs
    // from their achievement-definition order: cup_exit_r32 / Early Bath
    // (match), then reality_check, then forgot_kit. The unlocked Set's
    // insertion order carries the chronology; week stamps alone tie.
    await page.evaluate(() => {
      const week = { season: 1, week: 6, seasonLen: 48 };
      window.__fc.setState({
        unlockedAchievements: new Set(["cup_exit_r32", "reality_check", "forgot_kit"]),
        achievementUnlockWeeks: { cup_exit_r32: week, reality_check: week, forgot_kit: week },
      });
    });

    await page.getByText("CORNER SHOP", { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByText("CIG PACKS", { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Index list view" }).click();
    await page.waitForTimeout(300);

    // RECENT is the default sort: newest unlock first means forgot_kit on
    // top, early_bath (earned first) below the other two.
    const names = await page.locator('[data-testid="cig-index-row"][data-kind="collected"] [data-testid="cig-index-row-name"]')
      .allInnerTexts();
    const top3 = names.slice(0, 3).map(n => n.trim());
    expect(top3[0]).toBe("Forgot Kit");
    expect(top3[1]).toBe("Reality Check");
    expect(top3[2]).toBe("Early Bath");
  });

  test("boot room schedule flags a rival opponent with a RIVAL chip", async ({ page }, testInfo) => {
    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC" }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });

    // Real rivalry history only accumulates over many seasons of matches —
    // inject a qualifying ledger entry for the Matchday 1 opponent via the
    // dev hook rather than simulating a career's worth of fixtures.
    const oppName = await page.evaluate(() => {
      const s = window.__fc.getState();
      const week = s.league.fixtures[0];
      const fixture = week.find(f => f.home === 0 || f.away === 0);
      const oppIdx = fixture.home === 0 ? fixture.away : fixture.home;
      const opp = s.league.teams[oppIdx].name;
      window.__fc.setState({
        clubHistory: {
          ...s.clubHistory,
          rivalryLedger: {
            [opp]: { played: 5, wins: 0, draws: 1, losses: 4, closeGames: 2, redCards: 1, lastMeetings: [] },
          },
        },
      });
      return opp;
    });

    await page.getByText("BOOT ROOM", { exact: false }).first().click();
    await page.waitForTimeout(300);
    await page.getByText("CALENDAR", { exact: false }).first().click();
    await page.waitForTimeout(300);

    await expect(page.getByText(oppName, { exact: false }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("RIVAL", { exact: true }).first()).toBeVisible();
    await shot(page, testInfo.project.name, "flow-bootroom-rival-chip");
  });

  test("mobile: 5v5 panel fills by tap and swaps armed slots", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "tap-to-fill is a mobile interaction");

    await page.goto("index.html");
    await page.waitForFunction(() => !!window.__fc, null, { timeout: 10_000 });
    // Tier 2 is the mini-tournament tier; the squad-page 5v5 panel renders
    // whenever the player is still alive in the bracket, so inject the
    // minimal bracket state it reads (the real one is built at season end).
    await page.evaluate(() => window.__fc.newGame({ teamName: "Red Lion FC", tier: 2 }));
    await page.waitForFunction(() => window.__fc.getState().league != null, null, { timeout: 10_000 });
    await page.evaluate(() => window.__fc.setState({ miniTournamentBracket: { playerEliminated: false } }));

    await page.getByText("SQUAD", { exact: false }).first().click();
    await expect(page.getByText("5v5 MINI-TOURNAMENT SQUAD")).toBeVisible({ timeout: 5_000 });

    // Tap-to-fill: arm an uninjured squad player (unique surname — mobile
    // rows abbreviate first names), then tap an empty 5v5 slot.
    const target = await page.evaluate(() => {
      const s = window.__fc.getState();
      const surname = (n) => n.split(" ").slice(1).join(" ");
      const p = s.squad.find(pl =>
        !pl.injury && s.squad.filter(o => surname(o.name) === surname(pl.name)).length === 1
      );
      return { id: p.id, surname: surname(p.name) };
    });
    await page.getByText(target.surname, { exact: false }).filter({ hasNotText: "selected" }).first().click();
    await page.waitForTimeout(200);
    await page.locator('[data-testid="five-slot-0"]').click();

    const idsAfterFill = await page.evaluate(() => window.__fc.getState().fiveASideSquad);
    expect(idsAfterFill?.[0], "tapped player should land in the tapped slot").toBe(target.id);

    // Tap-to-swap: fill every slot, arm one, tap another — the two ids flip.
    await page.getByText("AUTO-PICK", { exact: true }).first().click();
    await page.waitForFunction(
      () => (window.__fc.getState().fiveASideSquad || []).filter(Boolean).length === 5,
      null, { timeout: 5_000 }
    );
    const before = await page.evaluate(() => [...window.__fc.getState().fiveASideSquad]);

    await page.locator('[data-testid="five-slot-0"]').click();
    await expect(page.locator('[data-testid="five-slot-0"]')).toHaveAttribute("data-armed", "true");
    await shot(page, testInfo.project.name, "flow-fiveaside-panel-armed");
    await page.locator('[data-testid="five-slot-1"]').click();

    const after = await page.evaluate(() => [...window.__fc.getState().fiveASideSquad]);
    expect(after[0], "armed slot should take the tapped slot's player").toBe(before[1]);
    expect(after[1], "tapped slot should take the armed slot's player").toBe(before[0]);
    await expect(page.locator('[data-testid="five-slot-0"]')).toHaveAttribute("data-armed", "false");
  });
});
