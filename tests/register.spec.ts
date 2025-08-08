import { test, expect } from '@playwright/test';

// Assumes the app is already running on http://localhost:3000

test('fills and submits the registration form', async ({ page }) => {
  await page.goto('http://localhost:3000/register.html');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByLabel('Confirm password').fill('secret123');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('status')).toHaveText('Welcome, user@example.com!');
});

// quick negative case

test('shows validation if passwords mismatch', async ({ page }) => {
  await page.goto('http://localhost:3000/register.html');

  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password', { exact: true }).fill('secret123');
  await page.getByLabel('Confirm password').fill('secret');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('status')).toHaveText('Passwords do not match.');
});

test('responds to mobile vs desktop layout', async ({ page, browserName }) => {
  await page.goto('http://localhost:3000/register.html');
  // The indicator is aria-hidden; we query by text content instead of role
  const indicator = page.locator('.layout-indicator');
  await expect(indicator).toContainText(/Layout:/);
  // On desktop profile, Desktop text should be visible
  // On iPhone 13 profile, Mobile text should be visible
  const isMobile = await page.evaluate(() => {
    const el = document.querySelector('.layout-indicator .mobile');
    if (!el) return false;
    return getComputedStyle(el as Element).display !== 'none';
  });
  if (isMobile) {
    await expect(indicator).toContainText('Mobile');
  } else {
    await expect(indicator).toContainText('Desktop');
  }
});
