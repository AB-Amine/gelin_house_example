import { test, expect } from '@playwright/test';
test.skip(
  process.env.E2E_DATABASE_ISOLATED === 'true',
  'Safe unconfigured-state checks use no external database.',
);
test('Fatu editorial homepage loads local optimized photography without horizontal overflow', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'L’art de révéler votre singularité.',
  );
  await expect(page.locator('.fatu-hero img')).toBeVisible();
  expect(
    await page
      .locator('.fatu-hero img')
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  await expect(
    page
      .locator('main')
      .getByText(
        'Photographie d’inspiration temporaire · Ce n’est pas une réalisation de Fatu.',
      )
      .first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page
    .locator('.fatu-photo img')
    .evaluateAll((imgs) =>
      Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())),
    );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({
    path: info.outputPath('fatu-home.png'),
    fullPage: true,
  });
});
test('language switching updates actual content, persists and supports Arabic RTL', async ({
  page,
}, info) => {
  await page.goto('/');
  await page
    .locator('.fatu-header')
    .getByRole('button', { name: 'EN', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'The art of bringing out your individuality.',
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page
    .locator('.fatu-header')
    .getByRole('button', { name: 'العربية', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'فن إبراز جمالك الفريد.',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('fatu-arabic.png'),
    fullPage: true,
  });
});
test('public navigation opens on mobile and identifies the active page', async ({
  page,
}) => {
  await page.goto('/');
  const toggle = page.locator('.fatu-menu');
  if (await toggle.isVisible()) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
  await page
    .locator('#fatu-navigation')
    .getByRole('link', { name: 'Portfolio', exact: true })
    .click();
  await expect(page).toHaveURL(/\/portfolio$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio');
  if (await toggle.isVisible()) await toggle.click();
  await expect(
    page
      .locator('#fatu-navigation')
      .getByRole('link', { name: 'Portfolio', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByText('Les photographies autorisées de Fatu seront publiées ici.'),
  ).toBeVisible();
});
test('all public pages expose honest empty states and responsive layouts', async ({
  page,
}) => {
  for (const path of [
    '/services',
    '/a-propos',
    '/portfolio',
    '/faq',
    '/contact',
    '/confidentialite',
    '/reservation',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
    await expect(page.locator('body')).not.toContainText('GELIN HOUSE');
  }
  await page.goto('/services/missing-service');
  await expect(
    page.getByRole('heading', { name: 'Cette page est introuvable.' }),
  ).toBeVisible();
  await page.goto('/galerie');
  await expect(page).toHaveURL(/\/portfolio$/);
});
test('stale basket selection can be removed while booking remains disabled', async ({
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
  const remove = page.getByRole('button', { name: 'Retirer', exact: true });
  await expect(remove).toHaveCount(1);
  await remove.click();
  await expect(remove).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Envoyer ma demande' }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Les réservations ouvriront après validation/),
  ).toBeVisible();
});
test('contact and authentication explain missing configuration without claiming success', async ({
  page,
}) => {
  await page.goto('/contact');
  await expect(
    page.getByRole('button', { name: 'Envoyer le message' }),
  ).toBeDisabled();
  await page.goto('/client/register');
  await expect(
    page.getByRole('button', { name: /Créer mon compte/ }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      'La connexion à Supabase est nécessaire pour enregistrer les données.',
    ),
  ).toBeVisible();
  await page.goto('/admin/services');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole('button', { name: 'Se connecter', exact: true }),
  ).toBeDisabled();
  await page.evaluate(() => localStorage.setItem('isAdmin', 'true'));
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/client/bookings');
  await expect(page).toHaveURL(/\/client\/login$/);
});
test('management capability stays private and privileged mutations reject unauthenticated callers', async ({
  page,
  request,
}) => {
  await page.goto('/reservation/gestion#invalid');
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe('');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  for (const path of [
    '/api/admin/requests',
    '/api/admin/payments',
    '/api/admin/client-note',
    '/api/admin/services',
    '/api/client/profile',
    '/api/client/requests',
  ]) {
    const r = await request.post(path, {
      headers: { Origin: 'http://127.0.0.1:3100' },
      data: {},
    });
    expect(r.status(), path).toBe(403);
  }
  const cross = await request.post('/api/bookings', {
    headers: { Origin: 'https://untrusted.example' },
    data: {},
  });
  expect(cross.status()).toBe(403);
  const preview = await request.get('/admin/preview');
  expect(preview.status()).toBe(404);
});
