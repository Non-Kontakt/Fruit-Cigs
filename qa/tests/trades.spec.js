import { test, expect } from "@playwright/test";

async function setup(page, targetOvr = 12, ownOvr = 10) {
  await page.goto("index.html");
  await page.waitForFunction(() => !!window.__fc);
  await page.evaluate(() => window.__fc.newGame({ teamName: "Trade QA" }));
  await page.waitForFunction(() => !!window.__fc.getState().league);
  const ids = await page.evaluate(async ({ targetOvr, ownOvr }) => {
    const { ACHIEVEMENTS, PLAYER_UNLOCK_ACHIEVEMENTS } = await import("/Fruit-Cigs/src/data/achievements.js");
    const s = window.__fc.getState();
    const attrs = n => Object.fromEntries(Object.keys(s.squad[0].attrs).map(key => [key, n]));
    const outgoing = { ...s.squad[0], name: "Qa Outgoing", position: "CM", age: 25, attrs: attrs(ownOvr) };
    const team = s.league.teams.find(t => !t.isPlayer);
    const ai = Array.from({ length: 4 }, (_, i) => ({ ...outgoing, id: `ai-trade-${i}`, name: `Qa Incoming${i}`, attrs: attrs(targetOvr) }));
    const league = { ...s.league, teams: s.league.teams.map(t => t === team ? { ...t, squad: ai } : t) };
    window.__fc.setState({
      league, allLeagueStates: { ...s.allLeagueStates, [s.leagueTier]: structuredClone(league) },
      squad: [outgoing, { ...s.squad[1], name: "Qa Support", attrs: attrs(12) }, ...s.squad.slice(2)],
      bench: [outgoing.id], startingXI: [], slotAssignments: null,
      clubRelationships: { ...s.clubRelationships, [team.name]: { pct: 100, tier: s.leagueTier } },
      transferWindowOpen: true, transferWindowWeeksRemaining: 3,
      transferOffers: [{ aiClubName: team.name, aiClubTier: s.leagueTier, aiWants: [outgoing], aiOffers: [ai[0]], relationship: 100, expiresWeeks: 3 }],
      unlockedAchievements: new Set(ACHIEVEMENTS.filter(a => !PLAYER_UNLOCK_ACHIEVEMENTS.has(a.id)).map(a => a.id)),
    });
    return { outgoing: outgoing.id, incoming: ai[0].id, club: team.name };
  }, { targetOvr, ownOvr });
  await page.getByRole("button", { name: /TRANSFERS/ }).click();
  await page.getByRole("button", { name: /OFFERS IN/ }).click();
  return ids;
}

test("manual quote rejects a cheap upgrade and honours a covered asking price", async ({ page }) => {
  const ids = await setup(page);
  await page.getByRole("button", { name: "COUNTER", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Trade proposal" });
  await dialog.getByText(/Outgoing/).last().click();
  await expect(dialog.getByRole("button", { name: "CONFIRM DEAL" })).toBeDisabled();
  await expect(dialog.getByText(/no negotiation premium/)).toBeVisible();
  // Add enough current squad value; the real confirm handler must move both owners.
  await dialog.getByText(/Support/).last().click();
  await expect(dialog.getByRole("button", { name: "CONFIRM DEAL" })).toBeEnabled();
  await dialog.getByRole("button", { name: "CONFIRM DEAL" }).click();
  await expect(page.getByText("DEAL DONE", { exact: true })).toBeVisible();
  const state = await page.evaluate(({ incoming, outgoing, club }) => {
    const s = window.__fc.getState();
    return { own: s.squad.map(p => p.id), ai: s.league.teams.find(t => t.name === club).squad.map(p => p.id), bench: s.bench, history: s.transferHistory.length };
  }, ids);
  expect(state.own).toContain(ids.incoming); expect(state.own).not.toContain(ids.outgoing);
  expect(state.ai).toContain(ids.outgoing); expect(state.ai).not.toContain(ids.incoming);
  expect(state.bench).not.toContain(ids.outgoing); expect(state.history).toBe(1);
});

test("a generous incoming offer is consumed and updates the live opponent", async ({ page }) => {
  const ids = await setup(page, 20, 10);
  await page.getByRole("button", { name: "ACCEPT", exact: true }).click();
  await expect(page.getByText("NO INCOMING OFFERS", { exact: true })).toBeVisible();
  const result = await page.evaluate(({ club }) => {
    const s = window.__fc.getState();
    return { own: s.squad.map(p => p.id), ai: s.league.teams.find(t => t.name === club).squad.map(p => p.id), history: s.transferHistory.length };
  }, ids);
  expect(result.own).toContain(ids.incoming); expect(result.own).not.toContain(ids.outgoing);
  expect(result.ai).toContain(ids.outgoing); expect(result.ai).not.toContain(ids.incoming);
  expect(result.history).toBe(1);
});
