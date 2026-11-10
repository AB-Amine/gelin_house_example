import { test, expect } from '@playwright/test';

test('preview opens without credentials and links stay inside sample data', async ({
  page,
}, testInfo) => {
  const mutations: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname.startsWith('/api/')
    )
      mutations.push(request.url());
  });
  await page.goto('/admin/preview');
  await expect(page.getByRole('heading', { name: /Bonjour/ })).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Données fictives' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Se déconnecter' }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('admin-preview.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Calendrier', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Vue', exact: true })
    .selectOption('month');
  await page.getByRole('button', { name: 'Afficher l’aperçu' }).click();
  const calendar = page.getByRole('region', { name: 'Calendrier mensuel' });
  await expect(calendar).toBeVisible();
  await calendar.locator('.calendar-event').first().click();
  await expect(page).toHaveURL(/\/admin\/preview\?section=appointments/);
  await expect(
    page.getByRole('heading', { name: 'Les rendez-vous', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Prestations', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Prestation exemple A', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Modifier', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Enregistrer', exact: true }),
  ).toHaveCount(0);
  expect(mutations).toEqual([]);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
