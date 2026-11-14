import { test, expect } from '@playwright/test';

test('public design shows database categories, active offers and licensed photos at every viewport', async ({
  page,
}, info) => {
  const errors: string[] = [];
  // Deliberately disagree with the server clock: prices must use its snapshot.
  await page.clock.setFixedTime(new Date('2101-01-01T12:00:00Z'));
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.premium-categories > a')).toHaveCount(4);
  await expect(
    page.getByRole('heading', {
      name: 'Les attentions du moment',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('.salon-testimonials')).toHaveCount(0);
  const servicesBounds = await page
    .locator('[data-home-section="services"]')
    .boundingBox();
  const galleryBounds = await page
    .locator('[data-home-section="gallery"]')
    .boundingBox();
  const aboutBounds = await page
    .locator('[data-home-section="about"] .fatu-container')
    .boundingBox();
  expect(servicesBounds).not.toBeNull();
  expect(galleryBounds).not.toBeNull();
  expect(aboutBounds).not.toBeNull();
  expect(Math.abs(servicesBounds!.x - galleryBounds!.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(servicesBounds!.width - aboutBounds!.width),
  ).toBeLessThanOrEqual(1);
  if (info.project.name === 'desktop') {
    for (const height of [720, 900, 1000]) {
      await page.setViewportSize({ width: 1440, height });
      await expect
        .poll(async () =>
          page.locator('[data-home-section="services"]').evaluate((node) => {
            const band = node.parentElement?.querySelector(
              '[data-home-first-screen] > section:last-child',
            );
            return (
              !!band &&
              node.getBoundingClientRect().top >= innerHeight - 1 &&
              Math.abs(band.getBoundingClientRect().bottom - innerHeight) <= 2
            );
          }),
        )
        .toBe(true);
      const strip = page.getByRole('region', {
        name: 'Votre demande de rendez-vous',
      });
      await expect
        .poll(async () =>
          strip.evaluate(
            (node) => Math.abs(node.getBoundingClientRect().bottom - innerHeight) <= 2,
          ),
        )
        .toBe(true);
    }
    await expect(
      page.locator('.premium-categories .premium-photo').first(),
    ).toHaveCSS('aspect-ratio', '3 / 4');
    expect(
      await page.locator('main:visible h1').evaluate((node) => {
        const range = document.createRange();
        range.selectNodeContents(node);
        return new Set(
          [...range.getClientRects()].map((rect) => Math.round(rect.top)),
        ).size;
      }),
    ).toBe(2);
    const buttons = await page
      .locator('main:visible [data-home-first-screen] .fatu-actions a')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().top),
      );
    expect(Math.abs(buttons[0] - buttons[1])).toBeLessThanOrEqual(1);
  }
  await expect(page.locator('[data-home-section]')).toHaveCount(4);
  const activeOffer = page
    .locator('.premium-offer-card')
    .filter({ hasText: 'TEST offre active' });
  const upcomingOffer = page
    .locator('.premium-offer-card')
    .filter({ hasText: 'TEST offre future' });
  await expect(activeOffer).toContainText('TEST offre active');
  await expect(activeOffer).toContainText('20 %');
  await expect(activeOffer.locator('.premium-offer-services')).toHaveCount(0);
  await expect(
    activeOffer.getByRole('link', { name: /Découvrir l’offre/ }),
  ).toHaveAttribute('href', '/offres');
  if (info.project.name === 'desktop') {
    const cardBounds = await activeOffer.boundingBox();
    const photoBounds = await activeOffer
      .locator('.premium-offer-photo')
      .boundingBox();
    expect(cardBounds!.height).toBeLessThan(380);
    expect(
      Math.abs(photoBounds!.height - cardBounds!.height),
    ).toBeLessThanOrEqual(3);
    expect(photoBounds!.width / cardBounds!.width).toBeGreaterThan(0.4);
    expect(photoBounds!.width / cardBounds!.width).toBeLessThan(0.46);
  }
  await expect(upcomingOffer).toHaveCount(0);
  await expect(page.locator('.premium-offer-card')).toHaveCount(2);
  await expect(
    page.getByRole('region', { name: 'Votre demande de rendez-vous' }),
  ).toContainText('Le salon vous confirme');
  await expect(
    page.getByText(
      'Votre rendez-vous est confirmé uniquement après validation par le salon.',
    ),
  ).toBeVisible();
  await expect(page.getByText(/TEST offre (expirée|inactive)/)).toHaveCount(0);
  await page
    .locator('.premium-hero-visual img')
    .evaluate((img: HTMLImageElement) => img.decode());
  await expect(
    page.locator('main .premium-photo figcaption, main .fatu-photo figcaption'),
  ).toHaveCount(0);
  await page.locator('.public-image-disclosure summary').click();
  await expect(page.locator('.public-image-disclosure')).toContainText(
    'images générées par IA',
  );
  await page.locator('.public-image-disclosure summary').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('main')).not.toContainText(/Fatu|FATU/);
  await page
    .locator('main img')
    .evaluateAll(async (images: HTMLImageElement[]) => {
      await Promise.all(
        images.map(async (image) => {
          image.loading = 'eager';
          await image.decode();
        }),
      );
    });
  await page.screenshot({
    path: info.outputPath('premium-home.png'),
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const menu = page.getByRole('button', { name: /Menu/ });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator('#fatu-navigation')
    .getByRole('link', { name: 'Offres', exact: true })
    .click();
  await expect(page).toHaveURL(/\/offres$/);
  await expect(upcomingOffer).toContainText('À venir');
  await expect(upcomingOffer).toContainText('2098');
  await expect(upcomingOffer.locator('time')).toHaveCount(2);
  await expect(activeOffer).toContainText('TEST conditions');
  await expect(activeOffer.locator('.premium-offer-services')).toContainText(
    'TEST panier 1',
  );
  await page.goto('/services');
  const card = page.locator('.service-card').filter({
    has: page.getByRole('heading', { name: 'TEST panier 1', exact: true }),
  });
  await expect(card.locator('.service-price small')).toHaveText(
    'TEST offre active',
  );
  await expect(card.locator('del')).toContainText('100');
  await expect(card.locator('.service-price')).toContainText('80');
  const futureService = page.locator('.service-card').filter({
    has: page.getByRole('heading', { name: 'TEST panier 2', exact: true }),
  });
  await expect(futureService.locator('.service-price')).toContainText('100');
  await expect(futureService.locator('del')).toHaveCount(0);
  await expect(futureService.locator('.service-price small')).toHaveCount(0);
  await page.getByRole('searchbox').fill('TEST panier');
  await expect(page.locator('.service-card')).toHaveCount(2);
  await page.screenshot({
    path: info.outputPath('premium-services.png'),
    fullPage: true,
    animations: 'disabled',
  });
  expect(errors).toEqual([]);
});

test('contact, about and authentic gallery controls remain usable', async ({
  page,
}, info) => {
  await page.goto('/a-propos');
  await expect(
    page.locator('main:visible .salon-about-hero img'),
  ).toHaveAttribute('alt', 'TEST salon — fixture uniquement');
  await page.goto('/portfolio');
  await page.locator('main:visible .fatu-image-button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer la photographie' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.locator('main:visible .fatu-image-button').first(),
  ).toBeFocused();
  await page.goto('/contact');
  const main = page.getByRole('main');
  await expect(
    main.getByRole('link', { name: '+212600000001', exact: true }),
  ).toHaveAttribute('href', 'tel:+212600000001');
  await expect(main.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute(
    'href',
    'https://wa.me/212600000001',
  );
  await page.route('**/api/contact', (route) =>
    route.fulfill({ json: { saved: true } }),
  );
  const form = main.locator('form');
  await form.locator('[name=name]').fill('TEST exemple');
  await form.locator('[name=email]').fill('test@example.com');
  await form.locator('[name=subject]').fill('TEST question');
  await form
    .locator('[name=message]')
    .fill('Message de vérification de la présentation.');
  await form.locator('[name=consent]').check();
  await page.screenshot({
    path: info.outputPath('premium-contact.png'),
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await form.getByRole('button', { name: /Envoyer le message/ }).click();
  await expect(form.getByRole('status')).toContainText('enregistré');
});
