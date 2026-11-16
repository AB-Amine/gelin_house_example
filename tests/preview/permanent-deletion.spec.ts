import { test, expect } from '@playwright/test';
test('service status confirmation preserves the record and reactivates without a destructive preview API', async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'fatu-admin-preview-v1',
      JSON.stringify({
        services: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            name: 'Manucure locale test',
            slug: 'manucure-locale-test',
            category_id: null,
            image_path: '',
            included_items: '',
            price_minor: null,
            published: true,
            archived: false,
            price_type: 'consultation',
            duration_minutes: null,
            subcategory: '',
            service_group: '',
            service_type: 'appointment',
            buffer_before: 0,
            buffer_after: 0,
            bookable: false,
            featured: false,
            position: 0,
            description: '',
            preparation: '',
          },
        ],
      }),
    ),
  );
  let writes = 0;
  await page.route('**/api/admin/**', async (route) => {
    writes++;
    await route.abort();
  });
  await page.goto('/admin/preview?section=services');
  const card = page
    .locator('.admin-record-card')
    .filter({ hasText: 'Manucure locale test' });
  const statusButton = card.getByRole('button', {
    name: 'Désactiver',
    exact: true,
  });
  expect(
    await statusButton.evaluate(
      (el) =>
        el.getBoundingClientRect().width >= 80 &&
        el.getBoundingClientRect().height <= 64,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await card.getByRole('button', { name: 'Désactiver', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Désactiver la prestation' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('historiques restent conservés');
  await expect(dialog.getByRole('button', { name: 'Annuler' })).toBeFocused();
  expect(
    await dialog.evaluate(
      (el) =>
        el.getBoundingClientRect().left >= 0 &&
        el.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath('service-status-dialog.png') });
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await card.getByRole('button', { name: 'Désactiver', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'Confirmer la désactivation' })
    .click();
  await expect(card.locator('.badge')).toHaveText('Désactivée');
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Activer', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmer l’activation' })
    .click();
  await expect(card.locator('.badge')).toHaveText('Active');
  expect(writes).toBe(0);
});
test('registered customer deletion shows a guarded preview without enabling deletion', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'fatu-admin-preview-v1',
      JSON.stringify({
        customers: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            kind: 'account',
            name: 'Cliente locale test',
            email: 'test@example.invalid',
            phone: '',
            created_at: '2026-01-01T00:00:00Z',
            bookings: 0,
          },
        ],
      }),
    ),
  );
  await page.goto('/admin/preview?section=clients');
  await page.route('**/api/admin/permanent-deletion', (route) =>
    route.fulfill({
      json: {
        entity: 'clients',
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Cliente locale test',
        fingerprint: 'a'.repeat(64),
        eligible: true,
        reasons: [],
        owned: [],
        details: {},
        deletionEnabled: false,
      },
    }),
  );
  await expect(
    page.getByRole('heading', { name: 'Profil cliente' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Suppression définitive' });
  await expect(dialog).toContainText('suppression définitive est désactivée');
  await expect(
    dialog.getByRole('button', { name: 'Supprimer définitivement' }),
  ).toHaveCount(0);
});
