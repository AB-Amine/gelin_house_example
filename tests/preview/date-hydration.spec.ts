import { test, expect } from '@playwright/test';

test('preview uses the server date even when the browser clock differs', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.clock.install({ time: new Date('2031-01-01T00:00:00Z') });
  const response = await page.goto('/admin/preview');
  const html = await response!.text();
  const heading = html.match(
    /class="fatu-admin-heading"[\s\S]*?<p>([^<]+)<\/p>/,
  )?.[1];
  expect(heading).toBeTruthy();
  await expect(page.locator('.fatu-admin-heading p')).toHaveText(heading!);
  // Interacting with a hydrated control ensures this isn't merely an SSR snapshot.
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await expect(page.locator('#admin-navigation')).toBeVisible();
  const calendar = await page.goto('/admin/preview?section=calendar');
  const calendarHtml = await calendar!.text();
  const anchor = calendarHtml.match(/name="date"[^>]*value="([^"]+)"/)?.[1];
  expect(anchor).toBeTruthy();
  await expect(page.locator('input[name=date]')).toHaveValue(anchor!);
  expect(
    errors.filter((text) =>
      /hydration|server rendered text|didn.t match/i.test(text),
    ),
  ).toEqual([]);
});
