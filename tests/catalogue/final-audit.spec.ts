import { test, expect } from '@playwright/test';

test('approved public layouts, images and console across the audit viewport matrix', async ({
  page,
  browser,
}, info) => {
  test.skip(
    info.project.name !== 'desktop',
    'This audit explicitly tests all requested widths.',
  );
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      '/',
      '/services',
      '/offres',
      '/portfolio',
      '/a-propos',
      '/contact',
      '/reservation',
      '/faq',
      '/confidentialite',
    ]) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
      const broken = await page
        .locator('main:visible img')
        .evaluateAll(async (images: HTMLImageElement[]) => {
          return (
            await Promise.all(
              images.map(async (image) => {
                image.loading = 'eager';
                try {
                  await image.decode();
                  return image.naturalWidth ? null : image.getAttribute('src');
                } catch {
                  return image.getAttribute('src');
                }
              }),
            )
          ).filter(Boolean);
        });
      expect(broken, `${route} image loading`).toEqual([]);
      if (
        (route === '/' && [390, 1440, 1920].includes(width)) ||
        (route === '/services' && width === 375) ||
        (route === '/contact' && width === 320)
      ) {
        await page.screenshot({
          path: info.outputPath(
            `${route === '/' ? 'home' : route.slice(1)}-${width}.png`,
          ),
          animations: 'disabled',
        });
      }
    }
  }
  // Native browser zoom is not exposed by Playwright. Check the equivalent CSS
  // viewport and DPR explicitly rather than claiming a native zoom operation.
  for (const physicalWidth of [1366, 1440]) {
    const context = await browser.newContext({
      viewport: {
        width: Math.round(physicalWidth / 1.2),
        height: Math.round(1000 / 1.2),
      },
      deviceScaleFactor: 1.2,
      reducedMotion: 'reduce',
    });
    const zoomPage = await context.newPage();
    await zoomPage.goto(
      info.project.use.baseURL
        ? String(info.project.use.baseURL)
        : 'http://127.0.0.1:3130',
    );
    await expect(zoomPage.getByRole('heading', { level: 1 })).toBeVisible();
    expect(
      await zoomPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await zoomPage.screenshot({
      path: info.outputPath(`zoom-120-equivalent-${physicalWidth}.png`),
    });
    await context.close();
  }
  expect(errors).toEqual([]);
});

test('public motion preserves keyboard focus, reduced motion and unavailable observers', async ({
  page,
  browser,
}, info) => {
  test.skip(
    info.project.name !== 'desktop',
    'Accessibility checks set their own mobile viewport.',
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const toggle = page.locator('.fatu-menu:visible');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#fatu-navigation:visible')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(
    await page
      .locator('.premium-hero-visual:visible')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  await page.goto('/admin/login');
  expect(
    await page
      .locator('main')
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  for (const javaScriptEnabled of [true]) {
    const context = await browser.newContext({ javaScriptEnabled });
    if (javaScriptEnabled)
      await context.addInitScript(() => {
        Object.defineProperty(window, 'IntersectionObserver', {
          value: undefined,
          configurable: true,
        });
      });
    const other = await context.newPage();
    await other.goto('http://127.0.0.1:3130/');
    await expect(other.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(
      other.getByRole('link', { name: /Choisir mes prestations/ }).first(),
    ).toBeVisible();
    expect(
      await other
        .locator('[data-home-first-screen]:visible')
        .evaluate((node) => getComputedStyle(node).opacity),
    ).toBe('1');
    await context.close();
  }
});

test('audit finding: public content is readable with JavaScript disabled', async ({
  browser,
}, info) => {
  test.skip(
    info.project.name !== 'desktop',
    'One explicit no-JavaScript audit probe.',
  );
  // Intentionally retained as a failing audit finding, not silently skipped:
  // streamed React content currently remains inside hidden #S:0 without JS.
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3130/');
    const probe = await page.evaluate(() => {
      const heading = document.querySelector('h1');
      const hiddenAncestors = [];
      for (let node = heading?.parentElement; node; node = node.parentElement) {
        if (getComputedStyle(node).display === 'none' || node.hidden)
          hiddenAncestors.push({
            tag: node.tagName,
            id: node.id,
            hidden: node.hidden,
          });
      }
      return {
        headingCount: document.querySelectorAll('h1').length,
        hiddenAncestors,
      };
    });
    await info.attach('no-javascript-probe.json', {
      body: JSON.stringify(probe),
      contentType: 'application/json',
    });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  } finally {
    await context.close();
  }
});
