import { test, expect, Page } from '@playwright/test';

async function startMission(page: Page, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: /INITIATE COMBAT DROP/ }).click();
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING');
}

test('boots, starts a mission, runs, pauses and resumes without page errors', async ({ page }) => {
  const errors: string[] = [];
  await startMission(page, errors);
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => window.__game!.getState().timeRemaining)).toBeLessThan(299);
  expect(await page.locator('canvas').count()).toBeGreaterThan(0);

  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => window.__game?.getState().status === 'PAUSED');
  await expect(page.getByText('TACTICAL PAUSE & SETTINGS')).toBeVisible();
  const frozen = await page.evaluate(() => window.__game!.getState().timeRemaining);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__game!.getState().timeRemaining)).toBe(frozen);

  await page.getByRole('button', { name: 'RESUME MISSION' }).click();
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING');
  expect(errors).toEqual([]);
});

test('choosing a level-up upgrade keeps live aliens in play and resumes the mission', async ({ page }) => {
  const errors: string[] = [];
  await startMission(page, errors);

  // Wait for the first drone to spawn (first spawn delay is 5 s)
  await page.waitForFunction(() => (window.__game?.getState().activeThreats.length ?? 0) > 0, undefined, {
    timeout: 45_000
  });
  const before = await page.evaluate(() => window.__game!.getState().activeThreats.map((t) => t.id));

  await page.evaluate(() => window.__game!.getState().registerKill('boss'));
  await page.waitForFunction(() => window.__game?.getState().status === 'LEVEL_UP');
  await expect(page.getByText(/FIELD UPGRADE/)).toBeVisible();

  await page.keyboard.press('Digit1');
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING');
  expect(await page.evaluate(() => window.__game!.getState().level)).toBe(2);
  expect(await page.evaluate(() => window.__game!.getState().activeUpgrades.length)).toBe(1);

  const after = await page.evaluate(() => window.__game!.getState().activeThreats.map((t) => t.id));
  expect(after.some((id) => before.includes(id))).toBe(true);
  expect(errors).toEqual([]);
});
