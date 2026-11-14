import { test, expect } from '@playwright/test';

test('mobile homepage follows the photo-first reference and preserves desktop proportions', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'desktop',
    'Widths are exercised explicitly in this test.',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const hero = page.locator('[data-home-first-screen] > section').first();
    const image = page.locator('.premium-hero-visual img');
    await expect(image).toHaveCount(1);
    await image.evaluate((node: HTMLImageElement) => node.decode());
    const title = page.getByRole('heading', { level: 1 });
    const buttons = hero.locator('.fatu-actions a');
    await expect(buttons).toHaveCount(2);
    await expect(buttons.nth(0)).toHaveAttribute('href', '/services');
    await expect(buttons.nth(1)).toHaveAttribute('href', '/offres');
    await expect(
      page
        .getByRole('region', { name: 'Votre demande de rendez-vous' })
        .locator('li'),
    ).toHaveCount(3);
    if (width <= 700) {
      const imageBox = (await image.boundingBox())!;
      const titleBox = (await title.boundingBox())!;
      expect(imageBox.y + imageBox.height).toBeLessThan(titleBox.y);
      expect(imageBox.height).toBeGreaterThan(250);
      expect((await buttons.nth(1).boundingBox())!.y).toBeGreaterThan(
        (await buttons.nth(0).boundingBox())!.y,
      );
      const menu = page.getByRole('button', { name: /Menu/ });
      await menu.click();
      await expect(page.locator('#fatu-navigation a:visible')).toHaveCount(8);
      await expect(
        page
          .locator('#fatu-navigation')
          .getByRole('link', { name: 'Mon espace', exact: true }),
      ).toHaveAttribute('href', '/client');
      await page.keyboard.press('Escape');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(
        page.locator('.fatu-header .home-language-select'),
      ).toBeVisible();
    }
    if (width === 1440) {
      const band = (await page
        .getByRole('region', { name: 'Votre demande de rendez-vous' })
        .boundingBox())!;
      expect(Math.abs(band.y + band.height - 1000)).toBeLessThanOrEqual(2);
      expect((await buttons.nth(0).boundingBox())!.y).toBe(
        (await buttons.nth(1).boundingBox())!.y,
      );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`homepage-${width}.png`),
      fullPage: width <= 430,
    });
  }
  await page.setViewportSize({ width: 390, height: 1000 });
  const language = page.locator('.fatu-header .home-language-select');
  for (const code of ['en', 'ar', 'fr']) {
    await language.selectOption(code);
    await expect(page.locator('html')).toHaveAttribute('lang', code);
    await expect(language).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole('button', { name: /Menu/ }).click();
  await page
    .locator('#fatu-navigation')
    .getByRole('link', { name: 'Offres', exact: true })
    .click();
  await expect(page).toHaveURL(/\/offres$/);
});
