import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('mobile: the install prompt is optional, remembered, and touch play works', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?e2e=1');

  const dialog = page.getByRole('dialog', { name: 'Install the app' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Open the browser menu')).toBeVisible();
  await dialog.getByRole('button', { name: 'PLAY IN BROWSER' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /INITIATE COMBAT DROP/ })).toBeVisible();

  // Dismissal is remembered across reloads
  await page.reload();
  await expect(page.getByRole('button', { name: /INITIATE COMBAT DROP/ })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Install the app' })).toBeHidden();

  await page.getByRole('button', { name: /INITIATE COMBAT DROP/ }).click();
  await page.waitForFunction(() => window.__game?.getState().status === 'PLAYING');
  await expect(page.getByRole('button', { name: 'PAUSE' })).toBeVisible();
  expect(errors).toEqual([]);
});
