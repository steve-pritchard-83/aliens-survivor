import { test, expect } from '@playwright/test';

// Drives the real WebXR path with an emulated Quest 3 (IWER): session entry, controller polling, VR level-up menu.
test('VR level-up: a held trigger never picks a card; stick selects and a fresh trigger confirms', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?e2e=1&iwer=1');
  await page.waitForFunction(() => !!window.__xrDevice);
  // The emulator reports a Quest user agent, so the app auto-enters VR and starts the mission like on a headset
  await page.waitForFunction(() => !!window.__xr?.getState().session, undefined, { timeout: 30_000 });
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING', undefined, { timeout: 30_000 });

  // The player is holding the trigger (firing) when the level-up happens
  await page.evaluate(() => window.__xrDevice!.controllers.right!.updateButtonValue('trigger', 1));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__game!.getState().registerKill('boss'));
  await page.waitForFunction(() => window.__game?.getState().status === 'LEVEL_UP');
  await page.waitForTimeout(1500); // longer than the menu's arm delay, trigger still held
  expect(await page.evaluate(() => window.__game!.getState().status)).toBe('LEVEL_UP');

  const second = await page.evaluate(() => window.__game!.getState().offeredUpgrades[1].id);

  // Release, push the right stick to the right, then press the trigger again
  await page.evaluate(() => window.__xrDevice!.controllers.right!.updateButtonValue('trigger', 0));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__xrDevice!.controllers.right!.updateAxes('thumbstick', 0.9, 0));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__xrDevice!.controllers.right!.updateAxes('thumbstick', 0, 0));
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__xrDevice!.controllers.right!.updateButtonValue('trigger', 1));
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING');

  expect(await page.evaluate(() => window.__game!.getState().activeUpgrades)).toEqual([second]);
  expect(errors).toEqual([]);
});
