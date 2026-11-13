import { test, expect } from '@playwright/test';
test('six main sections, real form shortcuts, and no technical fields', async ({
  page,
}, info) => {
  await page.goto('/admin/preview');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await expect(page.locator('#admin-navigation a')).toHaveCount(6);
  await expect(page.locator('#admin-navigation')).toContainText('Mon salon');
  await expect(page.locator('.salon-stats .stat-card')).toHaveCount(3);
  await page
    .locator('.salon-quick-actions')
    .getByRole('link', { name: 'Ajouter une prestation' })
    .click();
  await expect(page.locator('form.admin-form')).toBeVisible();
  await expect(
    page.getByRole('spinbutton', { name: 'Durée (minutes)', exact: true }),
  ).toBeEmpty();
  await expect(
    page.getByRole('textbox', { name: /slug|UUID|identifiant/i }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('salon-service-form.png'),
    fullPage: true,
  });
});
test('catalogue, offer and employee forms retain relationships and major-unit prices in local preview', async ({
  page,
}, info) => {
  const mutations: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().includes('/api/'))
      mutations.push(r.url());
  });
  await page.goto('/admin/preview?section=categories&new=1');
  await page
    .getByRole('textbox', { name: 'Nom', exact: true })
    .fill('Coiffure test');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Coiffure test' }),
  ).toBeVisible();
  await page.goto('/admin/preview?section=services&new=1');
  await page
    .getByRole('textbox', { name: 'Nom', exact: true })
    .fill('Brushing test');
  await page
    .getByRole('combobox', { name: 'Catégorie', exact: true })
    .selectOption({ label: 'Coiffure test' });
  await page
    .getByRole('combobox', { name: 'Type de prix', exact: true })
    .selectOption('fixed');
  await page
    .getByRole('spinbutton', { name: 'Prix (MAD)', exact: true })
    .fill('150.25');
  await page
    .getByRole('spinbutton', { name: 'Durée (minutes)', exact: true })
    .fill('45');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Brushing test' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('fatu-admin-preview-v1')!).services[0]
          .price_minor,
    ),
  ).toBe(15025);
  await page.goto('/admin/preview?section=promotions&new=1');
  await page
    .getByRole('textbox', { name: 'Nom', exact: true })
    .fill('Offre test');
  await page
    .getByRole('combobox', { name: 'Type de réduction', exact: true })
    .selectOption('fixed');
  await page
    .getByRole('spinbutton', { name: 'Réduction (MAD)', exact: true })
    .fill('50');
  await page.getByLabel('Début', { exact: false }).fill('2026-11-01T09:00');
  await page.getByLabel('Fin', { exact: false }).fill('2026-12-30T18:00');
  await page.getByRole('checkbox', { name: 'Brushing test' }).check();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Offre test' })).toBeVisible();
  await page.reload();
  await page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Offre test' }) })
    .getByRole('button', { name: 'Modifier' })
    .click();
  await expect(
    page.getByRole('checkbox', { name: 'Brushing test' }),
  ).toBeChecked();
  await expect(
    page.getByRole('spinbutton', { name: 'Réduction (MAD)' }),
  ).toHaveValue('50');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.goto('/admin/preview?section=staff&new=1');
  await page
    .getByRole('textbox', { name: 'Nom', exact: true })
    .fill('Employée test');
  await page.getByRole('checkbox', { name: 'Brushing test' }).check();
  await page.getByRole('button', { name: 'Ajouter une plage horaire' }).click();
  await page.getByLabel('Ouverture', { exact: true }).fill('09:00');
  await page.getByLabel('Fermeture', { exact: true }).fill('12:00');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Employée test' }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Brushing test' }),
  ).toBeChecked();
  await expect(page.getByLabel('Ouverture', { exact: true })).toHaveValue(
    '09:00',
  );
  await expect(page.getByLabel('Fermeture', { exact: true })).toHaveValue(
    '12:00',
  );
  expect(mutations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath('salon-employee-form.png'),
    fullPage: true,
  });
});
test('salon tabs save settings and allow direct navigation without confirmation prompts', async ({
  page,
}) => {
  await page.goto('/admin/preview?section=settings');
  await page
    .getByRole('textbox', { name: 'Nom', exact: true })
    .fill('GELIN HOUSE test');
  const dialogs: string[] = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.type());
    await dialog.dismiss();
  });
  await page.getByRole('link', { name: 'Site web', exact: true }).click();
  await expect(page).toHaveURL(/view=website/);
  await page.getByRole('link', { name: 'Informations', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Nom', exact: true })
    .fill('GELIN HOUSE test');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('link', { name: 'Site web', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Titre de l’accueil', exact: true })
    .fill('Bienvenue');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByRole('link', { name: 'Informations', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Nom', exact: true }),
  ).toHaveValue('GELIN HOUSE test');
  const settings = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('fatu-admin-preview-v1')!).settings[0],
  );
  expect(settings.notice_minutes).toBe(120);
  expect(settings.booking_enabled).toBe(false);
  expect(settings.hero_title).toBe('Bienvenue');
  expect(dialogs).toEqual([]);
});

test('five salon tabs reuse hours, website, photo and account editors without advanced navigation', async ({
  page,
}) => {
  await page.goto('/admin/preview?section=settings');
  const tabs = page.locator('.salon-tabs');
  await expect(tabs.getByRole('link')).toHaveText([
    'Informations',
    'Horaires',
    'Photos',
    'Site web',
    'Mon compte',
  ]);
  await expect(
    page.getByRole('link', { name: 'Réglages avancés et sécurité' }),
  ).toHaveCount(0);
  await tabs.getByRole('link', { name: 'Horaires', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Lundi', exact: true }).check();
  await page.getByLabel('Ouverture', { exact: true }).fill('09:00');
  await page.getByLabel('Fermeture', { exact: true }).fill('18:00');
  await page
    .getByRole('button', { name: 'Enregistrer les horaires', exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel('Ouverture', { exact: true })).toHaveValue(
    '09:00',
  );
  await expect(
    page.getByRole('heading', { name: 'Horaires exceptionnels', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Congés et fermetures', exact: true }),
  ).toBeVisible();
  await tabs.getByRole('link', { name: 'Photos', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Galerie', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByLabel('Photo', { exact: true })).toBeVisible();
  await tabs.getByRole('link', { name: 'Site web', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Questions fréquentes', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Avis clients', exact: true }),
  ).toBeVisible();
  const faq = page
    .locator('section')
    .filter({
      has: page.getByRole('heading', {
        name: 'Questions fréquentes',
        exact: true,
      }),
    });
  await faq.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await faq.getByLabel('Question', { exact: true }).fill('Question de test ?');
  await faq.getByLabel('Réponse', { exact: true }).fill('Réponse enregistrée.');
  await faq.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Question de test ?', exact: true }),
  ).toBeVisible();
  await tabs.getByRole('link', { name: 'Mon compte', exact: true }).click();
  await expect(
    page.getByRole('heading', {
      name: 'Changer mon mot de passe',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText('Accès administrateurs', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
