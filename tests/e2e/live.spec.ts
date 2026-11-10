import { test, expect } from '@playwright/test';
// Run against a dedicated configured Supabase test project, never the salon's production data.
test.describe('configured Supabase journeys', () => {
  test.skip(
    process.env.E2E_DATABASE_ISOLATED !== 'true' ||
      !process.env.E2E_OWNER_EMAIL ||
      !process.env.E2E_OWNER_PASSWORD,
    'Requires an isolated Supabase project and test owner credentials.',
  );
  test('owner authenticates, views persisted operational data, and logs out', async ({
    page,
  }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Adresse e-mail').fill(process.env.E2E_OWNER_EMAIL!);
    await page
      .getByLabel('Mot de passe', { exact: true })
      .fill(process.env.E2E_OWNER_PASSWORD!);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole('link', { name: 'Rendez-vous', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Les rendez-vous' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto('/admin/calendar');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
