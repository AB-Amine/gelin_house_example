import { test, expect } from '@playwright/test';

test('customers can request multiple services and a preferred date without the closed-booking messages', async ({
  page,
}, info) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/appointment-requests', async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ json: { saved: true } });
  });
  await page.goto('/reservation?prestation=gel-naturel');
  const form = page.getByRole('main').locator('.appointment-request-form');
  await expect(form).toBeVisible();
  await expect(
    page.getByText(/Les réservations ouvriront après validation/),
  ).toHaveCount(0);
  await expect(
    page.getByText('Une demande envoyée n’est pas un rendez-vous confirmé.', {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    form.getByRole('option', { name: 'Location de caftans', exact: true }),
  ).toHaveCount(0);
  await form.getByRole('combobox').selectOption({ label: 'Brushing simple' });
  await expect(
    form.locator('.appointment-request-selection .basket-row'),
  ).toHaveCount(2);
  await form.locator('input[name=name]').fill('TEST request customer');
  await form.locator('input[name=phone]').fill('+212612345678');

  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await form.locator('input[name=date]').fill(date);
  await form.locator('input[name=time]').fill('14:30');
  await form
    .locator('textarea[name=notes]')
    .fill('TEST preferred appointment details');
  await form.locator('input[name=consent]').check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('appointment-request-form.png'),
    fullPage: true,
  });
  await form
    .getByRole('button', { name: 'Envoyer ma demande', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Votre demande a bien été enregistrée.',
  );
  expect(requests).toHaveLength(1);
  expect(requests[0].services).toHaveLength(2);
  expect(requests[0].date).toBe(date);
  expect(requests[0].time).toBe('14:30');
  expect(requests[0].consent).toBe(true);
});

test('a failed request keeps customer inputs and never reports success', async ({
  page,
}) => {
  await page.route('**/api/appointment-requests', (route) =>
    route.fulfill({ status: 503, json: { error: 'Test unavailable' } }),
  );
  await page.goto('/reservation?prestation=gel-naturel');
  const form = page.getByRole('main').locator('.appointment-request-form');
  await form.locator('input[name=name]').fill('TEST retry customer');
  await form.locator('input[name=phone]').fill('+212612345678');

  await form
    .locator('input[name=date]')
    .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  await form.locator('input[name=time]').fill('14:30');
  await form.locator('input[name=consent]').check();
  await form
    .getByRole('button', { name: 'Envoyer ma demande', exact: true })
    .click();
  await expect(page.locator('main').getByRole('alert')).toBeVisible();
  await expect(form.locator('input[name=name]')).toHaveValue(
    'TEST retry customer',
  );
  await expect(form.locator('.basket-row')).toContainText('Gel naturel');
  await expect(
    page.getByText('Votre demande a bien été enregistrée.', { exact: true }),
  ).toHaveCount(0);
});

test('customers browse two services and send a request using only name and phone', async ({
  page,
}) => {
  let payload: Record<string, unknown> | undefined;
  await page.route('**/api/appointment-requests/availability', (route) =>
    route.fulfill({ json: { ready: false, slots: [] } }),
  );
  await page.route('**/api/appointment-requests', (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { saved: true, status: 'pending' } });
  });
  await page.goto('/services');
  for (const name of ['Gel naturel', 'Brushing simple']) {
    await page.getByRole('searchbox').fill(name);
    await page
      .locator('.official-service-card')
      .filter({ has: page.getByRole('heading', { name, exact: true }) })
      .getByRole('button')
      .click();
  }
  const summaryToggle = page
    .locator('#catalogue-basket')
    .getByRole('button', { name: /Mon rendez-vous/ });
  if (await summaryToggle.isVisible()) await summaryToggle.click();
  await page
    .locator('#catalogue-basket')
    .getByRole('link', { name: 'Choisir une date' })
    .click();
  const form = page.getByRole('main').locator('.appointment-request-form');
  await expect(form.locator('.basket-row')).toHaveCount(2);
  await form
    .locator('[name=date]')
    .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
  await form.locator('[name=time]').fill('14:30');
  await form.locator('[name=name]').fill('TEST simple customer');
  await form.locator('[name=phone]').fill('+212612345678');
  await form.locator('[name=consent]').check();
  await form
    .getByRole('button', { name: 'Envoyer ma demande', exact: true })
    .click();
  await expect(page.getByRole('main').getByRole('status')).toContainText(
    'en attente de confirmation',
  );
  expect(payload?.services).toHaveLength(2);
  expect(payload?.email).toBe('');
});

test('start-only requests accept a preferred time without promising interval availability', async ({
  page,
}) => {
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await page.route('**/api/appointment-requests/availability', (route) =>
    route.fulfill({
      json: {
        ready: true,
        timezone: 'Africa/Casablanca',
        slots: [{ starts_at: `${date}T13:30:00Z` }],
      },
    }),
  );
  await page.goto('/reservation?prestation=test-panier-1');
  const form = page.getByRole('main').locator('.appointment-request-form');
  await form.locator('[name=date]').fill(date);
  await expect(form.locator('input[name=time]')).toHaveCount(1);
  await form.locator('input[name=time]').fill('14:07');
  await expect(form.locator('input[name=time]')).toHaveValue('14:07');
  await expect(form.locator('select[name=time]')).toHaveCount(0);
  await expect(
    form.locator('[name=city], [name=resource], [name=staff]'),
  ).toHaveCount(0);
});
