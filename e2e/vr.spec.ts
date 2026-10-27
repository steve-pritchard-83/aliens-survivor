import { test, expect, Page } from '@playwright/test';

// These tests drive the real WebXR path with an emulated Quest 3 (IWER): session entry, controller polling,
// the in-headset menus and the VR rig. Software-rendered XR runs at a few frames per second, so inputs are held
// long enough to be sampled and waits are condition-based wherever the game exposes the outcome.
const HOLD = 1200;

const status = (page: Page) => page.evaluate(() => window.__game!.getState().status);
const headXZ = (page: Page) => page.evaluate(() => window.__headPosition!());
const trigger = (page: Page, value: number) =>
  page.evaluate((v) => window.__xrDevice!.controllers.right!.updateButtonValue('trigger', v), value);
const rightStick = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => window.__xrDevice!.controllers.right!.updateAxes('thumbstick', px, py), [x, y]);
const leftStick = (page: Page, x: number, y: number) =>
  page.evaluate(([px, py]) => window.__xrDevice!.controllers.left!.updateAxes('thumbstick', px, py), [x, y]);

/** Loads the app as a Quest, waits for the VR session and the in-headset start menu. */
async function openVrMenu(page: Page): Promise<void> {
  await page.goto('/?e2e=1&iwer=1');
  // Generous: the emulated session starts slowly on CI runners without a GPU
  await page.waitForFunction(() => !!window.__xr?.getState().session, undefined, { timeout: 60_000 });
  await page.waitForTimeout(HOLD); // the menu ignores input while arming
}

/**
 * Holds the right stick until `done` is true, then releases it. The menu reacts to a push on a single frame, and on a
 * slow software-rendered runner a fixed-length pulse can fall between two frames and be missed.
 */
async function pushUntil(page: Page, x: number, y: number, done: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 5; attempt++) {
    await rightStick(page, x, y);
    await page.waitForFunction(done, undefined, { timeout: 6_000 }).catch(() => undefined);
    await rightStick(page, 0, 0);
    await page.waitForTimeout(HOLD);
    if (await page.evaluate(done)) return;
  }
  throw new Error('the menu never acknowledged the stick input');
}

/** Presses and releases the trigger (a fresh press) and waits for the given status. */
async function pressTrigger(page: Page, expected: string): Promise<void> {
  await trigger(page, 0);
  await page.waitForTimeout(HOLD);
  await trigger(page, 1);
  await page.waitForFunction((s) => window.__game?.getState().status === s, expected, { timeout: 30_000 });
  await trigger(page, 0);
}

/** Opens the menu, deploys with the trigger, and waits until the mission clock is running. */
async function enterVrMission(page: Page): Promise<void> {
  await openVrMenu(page);
  await pressTrigger(page, 'PLAYING');
  await page.waitForFunction(() => (window.__game?.getState().timeRemaining ?? 300) < 299.5, undefined, {
    timeout: 45_000
  });
}

test('VR start: the mission waits in the menu and a trigger press deploys', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openVrMenu(page);
  await page.waitForTimeout(3000);
  expect(await status(page)).toBe('MENU');
  await pressTrigger(page, 'PLAYING');
  expect(errors).toEqual([]);
});

test('VR start menu: the stick picks the difficulty used by the next mission', async ({ page }) => {
  await openVrMenu(page);
  expect(await page.evaluate(() => window.__game!.getState().settings.difficulty)).toBe('marine');
  await rightStick(page, 0.9, 0);
  await page.waitForFunction(() => window.__game?.getState().settings.difficulty === 'ultimate_badass', undefined, {
    timeout: 30_000
  });
  await rightStick(page, 0, 0);
  await page.waitForTimeout(HOLD);
  await pressTrigger(page, 'PLAYING');
  expect(await page.evaluate(() => window.__game!.getState().rules.difficulty)).toBe('ultimate_badass');
  await page.evaluate(() => window.__game!.getState().updateSettings({ difficulty: 'marine' }));
});

test('VR level-up: a held trigger never picks a card; stick selects and a fresh trigger confirms', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enterVrMission(page);

  // The player is holding the trigger (firing) when the level-up happens
  await trigger(page, 1);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.__game!.getState().registerKill('boss');
    window.__game!.getState().openLevelUp();
  });
  await page.waitForFunction(() => window.__game?.getState().status === 'LEVEL_UP');
  await page.waitForTimeout(1500); // longer than the menu's arm delay, trigger still held
  expect(await status(page)).toBe('LEVEL_UP');

  const second = await page.evaluate(() => window.__game!.getState().offeredUpgrades[1].id);

  // Release, push the right stick to the right, then press the trigger again
  await trigger(page, 0);
  await page.waitForTimeout(HOLD);
  await rightStick(page, 0.9, 0);
  await page.waitForTimeout(HOLD);
  await rightStick(page, 0, 0);
  await page.waitForTimeout(HOLD);
  await trigger(page, 1);
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING');

  expect(await page.evaluate(() => window.__game!.getState().activeUpgrades)).toEqual([second]);
  expect(errors).toEqual([]);
});

test('VR pause menu: B opens it, the stick moves rows and adjusts, the trigger resumes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enterVrMission(page);
  const button = (id: string, value: number) =>
    page.evaluate(
      ([i, v]) => window.__xrDevice!.controllers.right!.updateButtonValue(i as string, v as number),
      [id, value]
    );

  await button('b-button', 1);
  await page.waitForFunction(() => window.__game?.getState().status === 'PAUSED', undefined, { timeout: 30_000 });
  await button('b-button', 0);
  await page.waitForTimeout(HOLD); // menu arm delay

  // Stick down: Resume -> Snap turn; stick right: next snap option (90 degrees -> smooth)
  await pushUntil(page, 0, 0.9, () => window.__vrMenuRow === 1);
  await pushUntil(page, 0.9, 0, () => window.__game?.getState().settings.snapAngle === 0);

  // Back up to Resume and confirm with a fresh trigger press
  await pushUntil(page, 0, -0.9, () => window.__vrMenuRow === 0);
  expect(await status(page)).toBe('PAUSED');
  await trigger(page, 1);
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING', undefined, { timeout: 30_000 });
  expect(errors).toEqual([]);
});

test('VR end screen never auto-restarts; a fresh trigger press redeploys', async ({ page }) => {
  await enterVrMission(page);
  await page.evaluate(() => window.__game!.getState().takeDamage(1000, 0));
  await page.waitForFunction(() => window.__game?.getState().status === 'DEFEAT');
  await trigger(page, 0);
  await page.waitForTimeout(11_000); // the old build restarted by itself after 9 s
  expect(await status(page)).toBe('DEFEAT');
  expect(await page.evaluate(() => window.__game!.getState().lastRun?.rank)).toBe(1);
  const run = await page.evaluate(() => window.__game!.getState().runId);
  await pressTrigger(page, 'PLAYING');
  expect(await page.evaluate(() => window.__game!.getState().runId)).toBe(run + 1);
});

test('VR session end pauses the mission', async ({ page }) => {
  await enterVrMission(page);
  await page.evaluate(() => void window.__xr!.getState().session!.end());
  await page.waitForFunction(() => window.__game?.getState().status === 'PAUSED', undefined, { timeout: 30_000 });
});

test('VR locomotion brings up the comfort vignette without shader errors', async ({ page }) => {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|WebGLProgram|GLSL/i.test(m.text())) problems.push(m.text());
  });
  await enterVrMission(page);
  const z0 = await page.evaluate(() => window.__game!.getState().playerPos[2]);
  await leftStick(page, 0, -0.9);
  await page.waitForFunction((start) => Math.abs(window.__game!.getState().playerPos[2] - start) > 0.3, z0, {
    timeout: 30_000
  });
  await page.waitForTimeout(1500); // frames rendered with the vignette visible
  await leftStick(page, 0, 0);
  expect(problems).toEqual([]);
});

test('VR snap turn pivots about the head, not the play-space centre', async ({ page }) => {
  await enterVrMission(page);
  await page.evaluate(() => window.__xrDevice!.position.set(0.1, 1.6, 0.5)); // head off-centre, away from walls
  await page.waitForTimeout(2000);
  const before = await headXZ(page);
  const yawBefore = await page.evaluate(() => window.__game!.getState().playerYaw);
  await rightStick(page, 0.9, 0);
  await page.waitForFunction((y0) => Math.abs(window.__game!.getState().playerYaw - y0) > 0.5, yawBefore, {
    timeout: 30_000
  });
  await rightStick(page, 0, 0);
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
  await page.waitForFunction((y0) => window.__headPosition!().y > y0 + 0.4, standing, { timeout: 30_000 });
  const seated = (await headXZ(page)).y;
  expect(seated - standing).toBeCloseTo(0.45, 1);
  await page.evaluate(() => window.__game!.getState().updateSettings({ seatedMode: false }));
});

test('VR mission starts with the head on the start position and walks at the configured speed', async ({ page }) => {
  await enterVrMission(page);
  await page.waitForTimeout(1500);
  const start = await headXZ(page);
  expect(start.x).toBeCloseTo(-0.32, 1);
  expect(start.z).toBeCloseTo(13.0, 1);

  // Speed is measured against the game's own clock, which is what movement integrates against.
  // Measurement starts once the head is actually moving, so input latency on a slow (software-rendered) runner
  // is not counted as time spent standing still.
  const zStart = (await headXZ(page)).z;
  await leftStick(page, 0, -1);
  await page.waitForFunction((z) => Math.abs(window.__headPosition!().z - z) > 0.1, zStart, { timeout: 60_000 });
  const t0 = await page.evaluate(() => window.__game!.getState().timeRemaining);
  const z0 = (await headXZ(page)).z;
  await page.waitForFunction((t) => t - window.__game!.getState().timeRemaining > 4, t0, { timeout: 60_000 });
  const t1 = await page.evaluate(() => window.__game!.getState().timeRemaining);
  const z1 = (await headXZ(page)).z;
  await leftStick(page, 0, 0);
  const speed = Math.abs(z1 - z0) / (t0 - t1);
  // Only an upper bound: a software-rendered runner draws a few frames a second and measures anywhere from 0.25 to
  // 1.2 m/s (CI and local runs, including the baseline commit), so a lower bound only measures the runner. That the
  // head moved at all is checked above; the configured speed is pinned by tests/playerMovement.test.ts.
  expect(speed).toBeGreaterThan(0);
  expect(speed).toBeLessThan(3.3);
});
