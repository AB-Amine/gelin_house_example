import { test, expect } from '@playwright/test';
test('official services render as database-supplied groups with honest prices and rental enquiry actions', async ({
  page,
}, info) => {
  await page.goto('/services');
  await expect(
    page.getByRole('heading', { name: 'Choisissez votre moment beauté' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Épilation', exact: true }),
  ).toBeVisible();
  let rendered = 0;
  let pricesOnRequest = 0;
  for (const name of ['Esthétique', 'Coiffure', 'Maquillage', 'Location']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    await page.getByRole('button', { name, exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Types de prestations' })
      .getByRole('button', { name: 'Tout voir', exact: true })
      .click();
    rendered += await page.locator('.official-service-card').count();
    pricesOnRequest += await page
      .locator('.official-service-card')
      .getByText('Prix sur demande', { exact: true })
      .count();
  }
  expect(rendered).toBe(69); // Official services plus the two isolated basket fixtures.
  expect(pricesOnRequest).toBe(67);
  await expect(page.getByText(/TEST (non publié|archivé)/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Esthétique', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Types de prestations' })
    .getByRole('button', { name: 'Onglerie', exact: true })
    .click();
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
  await expect(gel.getByRole('button')).toBeVisible();
  await page.getByRole('button', { name: 'Coiffure', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Types de prestations' })
    .getByRole('button', { name: 'Soins lissants', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Lissage Kerfactor', level: 4 }),
  ).toBeVisible();
  for (const name of ['Kerfactor Premium', 'Kerfactor Noir', 'Kerfactor Gold'])
    await expect(
      page.getByRole('heading', { name, exact: true }),
    ).toBeVisible();
  await page.getByRole('button', { name: 'Location', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Types de prestations' })
    .getByRole('button', { name: 'Tout voir', exact: true })
    .click();
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
  await page.getByRole('searchbox').fill('TEST panier 1');
  const first = page.locator('.official-service-card').filter({
    has: page.getByRole('heading', { name: 'TEST panier 1', exact: true }),
  });
  await first.getByRole('button').click();
  await page.getByRole('button', { name: 'Coiffure', exact: true }).click();
  await page.getByRole('searchbox').fill('TEST panier 2');
  const second = page.locator('.official-service-card').filter({
    has: page.getByRole('heading', { name: 'TEST panier 2', exact: true }),
  });
  await second.getByRole('button').click();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gh-basket')!)),
  ).toHaveLength(2);
  await page.getByRole('searchbox').fill('Kerfactor');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gh-basket')!)),
  ).toHaveLength(2);
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

test('accent-insensitive search and the appointment summary preserve selections and honest totals', async ({
  page,
}, info) => {
  await page.goto('/services');
  const basket = page.locator('#catalogue-basket');
  const openBasket = async () => {
    const toggle = basket.getByRole('button', { name: /Mon rendez-vous/ });
    if (
      (await toggle.isVisible()) &&
      (await toggle.getAttribute('aria-expanded')) === 'false'
    )
      await toggle.click();
  };
  await page.getByRole('searchbox').fill('epilation');
  await expect(page.locator('.official-service-card').first()).toContainText(
    'Épilation',
  );
  await page
    .locator('.official-service-card')
    .first()
    .getByRole('button')
    .click();
  await page.getByRole('searchbox').fill('TEST panier');
  await expect(page.locator('.official-service-card')).toHaveCount(2);
  for (const card of await page.locator('.official-service-card').all())
    await card.getByRole('button').click();
  await openBasket();
  await expect(basket.locator('li')).toHaveCount(3);
  await expect(basket.getByText('Total estimé')).toHaveCount(0); // One unknown price.
  await basket.getByRole('button', { name: /^Retirer Épilation/ }).click();
  await expect(basket.locator('li')).toHaveCount(2);
  await expect(
    basket.getByText('Total estimé', { exact: false }),
  ).toBeVisible();
  // The shared price helper still applies only the fixture's currently valid 20% discount.
  await expect(basket.locator('strong')).toHaveText(/180/);
  await page.getByRole('searchbox').fill('prestation inexistante');
  await expect(
    page.getByText('Aucune prestation ne correspond à votre recherche.'),
  ).toBeVisible();
  await expect(basket.locator('li')).toHaveCount(2);
  await page.reload();
  await openBasket();
  await expect(basket.locator('li')).toHaveCount(2);
  await basket
    .getByRole('button', { name: 'Retirer TEST panier 1', exact: true })
    .click();
  await expect(basket.locator('li')).toHaveCount(1);
  await basket.getByRole('link', { name: 'Choisir une date' }).click();
  await expect(page).toHaveURL(/\/reservation$/);
  await expect(
    page.locator('.appointment-request-selection .basket-row'),
  ).toHaveCount(1);
  await expect(page.locator('.appointment-request-selection')).toContainText(
    'TEST panier 2',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
