import { test, expect } from '@playwright/test';
test('official services render as database-supplied groups with honest prices and rental enquiry actions', async ({
  page,
}, info) => {
  await page.goto('/services');
  await expect(page.locator('.official-service-card')).toHaveCount(69); // 67 official + 2 explicitly named TEST basket fixtures.
  await expect(page.getByText('Prix sur demande', { exact: true })).toHaveCount(
    67,
  );
  for (const name of ['Esthétique', 'Coiffure', 'Makeup', 'Location'])
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Esthétique', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Onglerie', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Gel', exact: true }),
  ).toBeVisible();
  const gel = page.locator('.official-service-card').filter({
    has: page.getByRole('heading', { name: 'Gel naturel', exact: true }),
  });
  await expect(gel).not.toContainText(/null min|0 min/);
  await expect(gel.getByRole('button')).toHaveCount(1);
  await expect(
    gel.getByRole('button'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Coiffure', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lissage Kerfactor', level: 4 }),
  ).toBeVisible();
  for (const name of ['Kerfactor Premium', 'Kerfactor Noir', 'Kerfactor Gold'])
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  await page.getByRole('button', { name: 'Location', exact: true }).click();
  await expect(page.locator('.official-service-card')).toHaveCount(2);
  await expect(
    page.getByRole('link', { name: 'Demander une location', exact: true }),
  ).toHaveCount(2);
  await expect(page.locator('.official-service-card button')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('official-rentals.png'),
    fullPage: true,
  });
  await page.goto('/services/location-de-caftans');
  await expect(
    page
      .locator('.fatu-split')
      .getByRole('link', { name: 'Demander une location', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/null min|0 min/)).toHaveCount(0);
});
test('multi-service basket survives category changes, search, detail navigation and reload', async ({
  page,
}) => {
  await page.goto('/services');
  await page.getByRole('button', { name: 'Esthétique', exact: true }).click();
  const first = page.locator('.official-service-card').filter({
    has: page.getByRole('heading', { name: 'TEST panier 1', exact: true }),
  });
  await first.getByRole('button').click();
  await page.getByRole('button', { name: 'Coiffure', exact: true }).click();
  const second = page.locator('.official-service-card').filter({
    has: page.getByRole('heading', { name: 'TEST panier 2', exact: true }),
  });
  await second.getByRole('button').click();
  await expect(page.locator('.basket-link:visible')).toContainText('2');
  await page.getByRole('searchbox').fill('Kerfactor');
  await expect(page.locator('.basket-link:visible')).toContainText('2');
  await page.goto('/services/test-panier-1');
  await expect(page.locator('.basket-link:visible')).toContainText('2');
  await page.reload();
  await expect(page.locator('.basket-link:visible')).toContainText('2');
  await page.locator('main').getByRole('button', { pressed: true }).click();
  await expect(page.locator('.basket-link:visible')).toContainText('1');
  await page.goto('/reservation');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gh-basket')!)),
  ).toHaveLength(1);
});
