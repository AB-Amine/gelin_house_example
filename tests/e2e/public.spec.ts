import { test, expect } from '@playwright/test';
test('local admin preview is unavailable in production', async ({
  request,
}) => {
  const response = await request.get('/admin/preview');
  expect(response.status()).toBe(404);
});
test.skip(
  process.env.E2E_DATABASE_ISOLATED === 'true',
  'These tests exercise the unconfigured safe state.',
);
test('persisted selection is deduplicated, revalidated, and removable', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'gh-basket',
      JSON.stringify([
        '11111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
        'invalid',
      ]),
    ),
  );
  await page.goto('/reservation');
  await expect(
    page.getByText('Prestation indisponible', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retirer', exact: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Retirer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Votre moment commence ici.' }),
  ).toBeVisible();
});
test('homepage is responsive and shows honest configuration state', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Un moment/, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText('Photographies du salon à venir')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('home.png'),
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Découvrir les prestations' }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole('searchbox')).toBeVisible();
});
test('empty basket cannot submit a booking', async ({ page }) => {
  await page.goto('/reservation');
  await expect(
    page.getByRole('heading', { name: 'Votre moment commence ici.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Envoyer ma demande/ }),
  ).toHaveCount(0);
  await expect(page.getByText('La réservation sera ouverte')).toBeVisible();
});
test('public pages have real empty states and working navigation', async ({
  page,
}) => {
  for (const [path, title] of [
    ['/offres', 'Pas d’offre en cours'],
    ['/contact', 'Nous contacter'],
    ['/confidentialite', 'Votre réservation'],
    ['/a-propos', 'Une beauté à votre image.'],
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto('/services/not-a-real-service');
  await expect(page.getByRole('heading', { name: /Cette page/ })).toBeVisible();
});
test('private admin redirects; no fake session in browser storage', async ({
  page,
}) => {
  await page.goto('/admin/services');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole('textbox', { name: 'Adresse e-mail' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Se connecter' }),
  ).toBeDisabled();
  await page.evaluate(() => localStorage.setItem('isAdmin', 'true'));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
});
test('secure management rejects missing capability; pages are noindex', async ({
  page,
}) => {
  await page.goto('/reservation/gestion');
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  expect(await page.evaluate(() => location.hash)).toBe('');
});
test('server rejects anonymous admin mutation and cross-origin booking', async ({
  request,
}) => {
  const admin = await request.post('/api/admin/services', {
    headers: { Origin: 'http://127.0.0.1:3100' },
    data: { name: 'unauthorized' },
  });
  expect(admin.status()).toBe(403);
  const booking = await request.post('/api/bookings', {
    headers: { Origin: 'https://untrusted.example' },
    data: {},
  });
  expect(booking.status()).toBe(403);
  expect((await booking.json()).code).toBe('FORBIDDEN');
});
