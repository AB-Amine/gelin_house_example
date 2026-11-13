import { test, expect } from '@playwright/test';
test('private management capability exchanges once under development Strict Mode', async ({
  page,
}) => {
  let exchanges = 0;
  await page.route('**/api/manage', async (route) => {
    if (route.request().method() === 'POST') {
      exchanges++;
      await route.fulfill({
        json: {
          id: '11111111-1111-4111-8111-111111111111',
          reference: 'TEST-STRICT-MODE',
          status: 'pending',
          starts_at: '2026-12-01T10:00:00Z',
          ends_at: '2026-12-01T11:00:00Z',
          total_minor: 0,
          uncertain: false,
          items: [],
          history: [],
        },
      });
    } else
      await route.fulfill({
        status: 403,
        json: { code: 'FORBIDDEN', error: 'Test missing capability' },
      });
  });
  await page.goto('/reservation/gestion#' + 'a'.repeat(64));
  await expect(
    page.getByText('TEST-STRICT-MODE', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  expect(exchanges).toBe(1);
  expect(await page.evaluate(() => location.hash)).toBe('');
});
test('preview edits persist locally, preserve public truth and never call a mutation API', async ({
  page,
}, info) => {
  const mutations: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname.startsWith('/api/'))
      mutations.push(r.url());
  });
  await page.goto('/admin/preview?section=locations');
  await expect(
    page.getByRole('status').filter({ hasText: 'Aperçu de développement' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nom', exact: true })
    .fill('Ville de test');
  await expect(
    page.getByRole('textbox', { name: /Adresse courte/ }),
  ).toHaveCount(0);
  await page
    .getByRole('spinbutton', { name: 'Frais de déplacement (MAD)' })
    .fill('25');
  await page.getByRole('checkbox', { name: 'Actif', exact: true }).check();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    page.getByText(
      'Aperçu enregistré dans ce navigateur uniquement. Le site public n’a pas été modifié.',
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Ville de test', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('fatu-admin-cities.png'),
    fullPage: true,
  });
  await page.goto('/services');
  await expect(
    page.getByText(/La carte des prestations est en cours de validation/),
  ).toBeVisible();
  expect(mutations).toEqual([]);
});
test('preview calendar switches views and administration remains French', async ({
  page,
}, info) => {
  await page.goto('/admin/preview?section=calendar');
  await page
    .getByRole('combobox', { name: 'Vue', exact: true })
    .selectOption('month');
  await page.getByRole('button', { name: 'Filtrer', exact: true }).click();
  await expect(page.locator('.calendar-grid.month')).toBeVisible();
  await expect(page).toHaveURL(/view=month/);
  await Promise.all([
    page.waitForURL(/view=day/),
    page.locator('.calendar-date').first().click(),
  ]);
  await expect(page).toHaveURL(/view=day/);
  await page
    .context()
    .addCookies([
      { name: 'fatu-language', value: 'ar', url: 'http://127.0.0.1:3000' },
    ]);
  await page.reload();
  await expect(page.locator('.salon-admin')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Calendrier',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('fatu-admin-arabic.png'),
    fullPage: true,
  });
});
