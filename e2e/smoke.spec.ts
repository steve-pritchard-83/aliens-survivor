import { test, expect, Page } from '@playwright/test';

async function startMission(page: Page, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?e2e=1');
  await page.getByRole('button', { name: /INITIATE COMBAT DROP/ }).click();
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING');
  // The scene loads its models behind Suspense; the clock only runs once the player controller is mounted
  await page.waitForFunction(() => (window.__game?.getState().timeRemaining ?? 300) < 299.5, undefined, {
    timeout: 45_000
  });
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

test('settings changes apply immediately and persist across a reload', async ({ page }) => {
  const errors: string[] = [];
  await startMission(page, errors);
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => window.__game?.getState().status === 'PAUSED');

  await page.getByLabel('Master volume').fill('0.5');
  await page.getByRole('switch', { name: 'Invert Y axis' }).click();
  await page.getByRole('button', { name: '45°' }).click();
  const s = await page.evaluate(() => window.__game!.getState().settings);
  expect(s.masterVolume).toBeCloseTo(0.5);
  expect(s.invertY).toBe(true);
  expect(s.snapAngle).toBeCloseTo(Math.PI / 4);

  await page.reload();
  await page.waitForFunction(() => !!window.__game);
  const after = await page.evaluate(() => window.__game!.getState().settings);
  expect(after.masterVolume).toBeCloseTo(0.5);
  expect(after.invertY).toBe(true);
  expect(errors).toEqual([]);
});
