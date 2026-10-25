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

test('VR pause menu: B opens it, the stick moves rows and adjusts, the trigger resumes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?e2e=1&iwer=1');
  await page.waitForFunction(() => !!window.__xr?.getState().session, undefined, { timeout: 30_000 });
  await page.waitForFunction(() => (window.__game?.getState().timeRemaining ?? 300) < 299.5, undefined, {
    timeout: 45_000
  });
  // Software-rendered XR runs at a few frames per second, so inputs are held long enough to be sampled
  const HOLD = 1200;
  const button = (id: string, value: number) =>
    page.evaluate(
      ([i, v]) => window.__xrDevice!.controllers.right!.updateButtonValue(i as string, v as number),
      [id, value]
    );
  const stick = (x: number, y: number) =>
    page.evaluate(([px, py]) => window.__xrDevice!.controllers.right!.updateAxes('thumbstick', px, py), [x, y]);
  const status = () => page.evaluate(() => window.__game!.getState().status);

  await button('b-button', 1);
  await page.waitForFunction(() => window.__game?.getState().status === 'PAUSED', undefined, { timeout: 30_000 });
  await button('b-button', 0);
  await page.waitForTimeout(HOLD); // menu arm delay

  // Stick down: Resume -> Snap turn; stick right: next snap option (90 degrees -> smooth)
  await stick(0, 0.9);
  await page.waitForTimeout(HOLD);
  await stick(0, 0);
  await page.waitForTimeout(HOLD);
  await stick(0.9, 0);
  await page.waitForFunction(() => window.__game?.getState().settings.snapAngle === 0, undefined, { timeout: 30_000 });
  await stick(0, 0);
  await page.waitForTimeout(HOLD);

  // Back up to Resume and confirm with a fresh trigger press
  await stick(0, -0.9);
  await page.waitForTimeout(HOLD);
  await stick(0, 0);
  await page.waitForTimeout(HOLD);
  expect(await status()).toBe('PAUSED');
  await button('trigger', 1);
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING', undefined, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('VR locomotion brings up the comfort vignette without shader errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|WebGLProgram|GLSL/i.test(m.text())) problems.push(m.text());
  });
  await page.goto('/?e2e=1&iwer=1');
  await page.waitForFunction(() => !!window.__xr?.getState().session, undefined, { timeout: 30_000 });
  await page.waitForFunction(() => (window.__game?.getState().timeRemaining ?? 300) < 299.5, undefined, {
    timeout: 45_000
  });
  const z0 = await page.evaluate(() => window.__game!.getState().playerPos[2]);
  await page.evaluate(() => window.__xrDevice!.controllers.left!.updateAxes('thumbstick', 0, -0.9));
  await page.waitForFunction((start) => Math.abs(window.__game!.getState().playerPos[2] - start) > 0.3, z0, {
    timeout: 30_000
  });
  await page.waitForTimeout(1500); // frames rendered with the vignette visible
  await page.evaluate(() => window.__xrDevice!.controllers.left!.updateAxes('thumbstick', 0, 0));
  expect(problems).toEqual([]);
});

async function enterVrMission(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/?e2e=1&iwer=1');
  await page.waitForFunction(() => !!window.__xr?.getState().session, undefined, { timeout: 30_000 });
  await page.waitForFunction(() => (window.__game?.getState().timeRemaining ?? 300) < 299.5, undefined, {
    timeout: 45_000
  });
}

const headXZ = (page: import('@playwright/test').Page) => page.evaluate(() => window.__headPosition!());

test('VR snap turn pivots about the head, not the play-space centre', async ({ page }) => {
  await enterVrMission(page);
  await page.evaluate(() => window.__xrDevice!.position.set(0.5, 1.6, 0)); // head half a metre off-centre
  await page.waitForTimeout(2000);
  const before = await headXZ(page);
  const yawBefore = await page.evaluate(() => window.__game!.getState().playerYaw);
  await page.evaluate(() => window.__xrDevice!.controllers.right!.updateAxes('thumbstick', 0.9, 0));
  await page.waitForFunction((y0) => Math.abs(window.__game!.getState().playerYaw - y0) > 0.5, yawBefore, {
    timeout: 30_000
  });
  await page.evaluate(() => window.__xrDevice!.controllers.right!.updateAxes('thumbstick', 0, 0));
  await page.waitForTimeout(1500);
  const after = await headXZ(page);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.03);
});

test('VR room-scale steps through a wall are pushed back into the corridor', async ({ page }) => {
  await enterVrMission(page);
  await page.evaluate(() => window.__xrDevice!.position.set(1.5, 1.6, 0)); // physically stepped 1.5 m right
  await page.waitForFunction(() => window.__game!.getState().playerPos[0] < 0.2, undefined, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  const head = await headXZ(page);
  expect(head.x).toBeLessThanOrEqual(0.17 + 0.01); // east wall at 0.32 minus the 0.15 m margin
  expect(await page.evaluate(() => window.__game!.getState().playerPos[0])).toBeLessThanOrEqual(0.18);
});

test('VR seated mode raises the origin so a lower headset keeps a standing eye height', async ({ page }) => {
  await enterVrMission(page);
  const standing = (await headXZ(page)).y;
  await page.evaluate(() => window.__game!.getState().updateSettings({ seatedMode: true }));
  await page.waitForFunction((y0) => window.__headPosition!().y > y0 + 0.4, standing, {
    timeout: 30_000
  });
  const seated = (await headXZ(page)).y;
  expect(seated - standing).toBeCloseTo(0.45, 1);
  await page.evaluate(() => window.__game!.getState().updateSettings({ seatedMode: false }));
});

test('VR mission starts with the head on the start position and movement speed is the configured walking speed', async ({
  page
}) => {
  await enterVrMission(page);
  await page.waitForTimeout(1500);
  const start = await headXZ(page);
  expect(start.x).toBeCloseTo(-0.32, 1);
  expect(start.z).toBeCloseTo(13.0, 1);

  // Walk forward for a measured period; software-rendered XR frame times vary wildly, so speed is measured
  // from the game's own clock, which is what the movement integrates against
  const t0 = await page.evaluate(() => window.__game!.getState().timeRemaining);
  const z0 = (await headXZ(page)).z;
  await page.evaluate(() => window.__xrDevice!.controllers.left!.updateAxes('thumbstick', 0, -1));
  await page.waitForFunction((t) => t - window.__game!.getState().timeRemaining > 4, t0, { timeout: 60_000 });
  const t1 = await page.evaluate(() => window.__game!.getState().timeRemaining);
  const z1 = (await headXZ(page)).z;
  await page.evaluate(() => window.__xrDevice!.controllers.left!.updateAxes('thumbstick', 0, 0));
  const speed = Math.abs(z1 - z0) / (t0 - t1);
  expect(speed).toBeGreaterThan(1.0);
  expect(speed).toBeLessThan(1.3);
});
