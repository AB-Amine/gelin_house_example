import { test, expect } from '@playwright/test';

test('about content, real-gallery priority and category links work without fictitious production reviews', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/a-propos');
  const main = page.locator('main:visible');
  await expect(main.locator('h1')).toContainText('Bienvenue chez');
  await expect(main.locator('.premium-category')).toHaveCount(4);
  await expect(main.locator('.salon-philosophy-grid')).toContainText(
    'TEST écoute personnalisée',
  );
  await expect(main.locator('.salon-philosophy-grid')).toContainText(
    'TEST texte éditable',
  );
  await expect(main.locator('.salon-example-notice')).toHaveCount(0);
  await expect(main.locator('.salon-testimonials')).toHaveCount(0);
  await main.locator('img').evaluateAll(async (imgs: HTMLImageElement[]) => {
    await Promise.all(
      imgs.map(async (img) => {
        img.loading = 'eager';
        await img.decode();
      }),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('about-editorial.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await main.getByRole('link', { name: /Coiffure/ }).click();
  await expect(page).toHaveURL(/categorie=coiffure/);
  await expect(
    page.getByRole('button', { name: 'Coiffure', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/portfolio');
  await page.getByRole('button', { name: 'Salon', exact: true }).click();
  await expect(main.locator('.fatu-image-button')).toHaveCount(1);
  await main.locator('.fatu-image-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.salon-gallery-counter')).toHaveText('1 / 1');
  await page.keyboard.press('Escape');
  await expect(main.locator('.fatu-image-button')).toBeFocused();
});

test('homepage previews two current offers and the offers page keeps the complete carousel', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('main .premium-offer-card')).toHaveCount(2);
  await expect(
    page.locator('main .premium-offer-card.is-upcoming'),
  ).toHaveCount(0);
  await page.goto('/offres');
  const track = page.locator('main:visible .premium-offer-grid.is-carousel');
  await expect(track.locator('.premium-offer-card')).toHaveCount(4);
  await expect(track.locator('.premium-offer-photo img')).toHaveCount(4);
  expect(
    await track.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Offres suivantes' }).click();
  await expect
    .poll(() => track.evaluate((node) => Math.abs(node.scrollLeft)))
    .toBeGreaterThan(0);
  await track.scrollIntoViewIfNeeded();
  await expect(track.locator('.is-upcoming')).toBeInViewport();
  for (let i = 0; i < 3; i++)
    await page.getByRole('button', { name: 'Offres précédentes' }).click();
  await expect
    .poll(() => track.evaluate((node) => Math.abs(node.scrollLeft)))
    .toBeLessThanOrEqual(4);
  await track.screenshot({ path: info.outputPath('offers-carousel.png') });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
