import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display home page content', async ({ page }) => {
    await page.goto('/');

    // Check if the page loads
    await expect(page).toHaveTitle(/Learnify LMS/);

    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();

    // Check for main content
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/');

    // Click on sign in link/button
    const signInLink = page.locator('a[href="/auth/signin"]');
    await expect(signInLink).toBeVisible();
    await signInLink.click();

    // Verify navigation to sign in page
    await expect(page).toHaveURL('/auth/signin');
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('/');

    // Click on sign up link/button
    const signUpLink = page.locator('a[href="/auth/signup"]');
    await expect(signUpLink).toBeVisible();
    await signUpLink.click();

    // Verify navigation to sign up page
    await expect(page).toHaveURL('/auth/signup');
  });

  test('should display responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check if mobile navigation is accessible
    await expect(page.locator('nav')).toBeVisible();

    // Verify content is readable on mobile
    await expect(page.locator('main')).toBeVisible();
  });
});
