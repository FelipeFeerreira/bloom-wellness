import { expect, test } from '@playwright/test';

test('home page renders every section without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Feel like yourself.');
  for (const id of ['about', 'services', 'booking', 'team', 'contact', 'visit', 'automation']) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a contact message is saved and its automations are tracked live', async ({ page }) => {
  await page.goto('/#contact');
  const form = page.getByRole('form', { name: 'Contact form' });
  await form.getByLabel('Full name *').fill('E2E Visitor');
  await form.getByLabel('Email address *').fill(`e2e+${Date.now()}@example.com`);
  await form.getByLabel('How can we help?').fill('Testing the full flow end to end.');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: /send message/i }).click();

  await expect(page.getByText('Thank you, E2E!')).toBeVisible();
  await expect(page.getByText('Received from E2E Visitor')).toBeVisible();
  await expect(page.getByText('Stored in the CRM')).toBeVisible();
});

test('service cards preselect the treatment in the booking form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Book Acupuncture' }).click();
  await expect(page.getByLabel('01 — Your treatment')).toHaveValue('acupuncture');
});
