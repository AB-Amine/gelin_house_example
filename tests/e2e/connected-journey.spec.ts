import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { money } from '../../src/lib/domain';

test('customer booking, persisted admin edits, promotion, cancellation and logout', async ({
  page,
}) => {
  test.skip(
    process.env.E2E_DATABASE_ISOLATED !== 'true' ||
      !process.env.E2E_OWNER_EMAIL ||
      !process.env.E2E_OWNER_PASSWORD ||
      !process.env.SUPABASE_SECRET_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Requires a disposable configured Supabase test project.',
  );
  test.setTimeout(120000);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const prefix = `TEST-${randomUUID().slice(0, 8)}`;
  const { data: resource, error: resourceError } = await db
    .from('resources')
    .insert({ name: prefix, kind: 'staff' })
    .select('id')
    .single();
  expect(resourceError).toBeNull();
  const { data: category, error: categoryError } = await db
    .from('categories')
    .insert({ name: prefix, slug: prefix.toLowerCase(), published: true })
    .select('id')
    .single();
  expect(categoryError).toBeNull();
  const { data: services, error: serviceError } = await db
    .from('services')
    .insert(
      [10, 15].map((duration, i) => ({
        name: `${prefix} ${i}`,
        slug: `${prefix.toLowerCase()}-${i}`,
        category_id: category!.id,
        duration_minutes: duration,
        price_minor: 10000,
        published: true,
        bookable: true,
      })),
    )
    .select('id,name');
  expect(serviceError).toBeNull();
  expect(
    (
      await db.from('qualifications').insert(
        services!.map((s) => ({
          resource_id: resource!.id,
          service_id: s.id,
        })),
      )
    ).error,
  ).toBeNull();
  expect(
    (
      await db.from('working_hours').insert(
        [null, resource!.id].flatMap((resource_id) =>
          Array.from({ length: 7 }, (_, weekday) => ({
            resource_id,
            weekday,
            opens: '00:00',
            closes: '23:59',
          })),
        ),
      )
    ).error,
  ).toBeNull();
  expect(
    (
      await db
        .from('salon_settings')
        .update({
          approved: true,
          booking_enabled: true,
          phone: '+212612345678',
          privacy_text: 'TEST ONLY — disposable test project.',
          policy_text:
            'TEST ONLY — pending requests reserve capacity until salon action.',
          notice_minutes: 0,
          horizon_days: 30,
          increment_minutes: 15,
          cancellation_enabled: true,
          cancellation_notice_hours: 0,
          rescheduling_enabled: true,
          rescheduling_notice_hours: 0,
        })
        .eq('id', 1)
    ).error,
  ).toBeNull();
  await page.goto('/services');
  for (const service of services!) {
    await page
      .locator('article')
      .filter({ hasText: service.name })
      .getByRole('button', { name: 'Choisir cette prestation' })
      .click();
  }
  await page.getByRole('link', { name: /Ma sélection/ }).click();
  const tomorrow = Temporal.Now.zonedDateTimeISO('Africa/Casablanca')
    .toPlainDate()
    .add({ days: 1 })
    .toString();
  await page.getByLabel('Choisir une date').fill(tomorrow);
  await page.getByRole('button', { name: 'Voir les disponibilités' }).click();
  await page.locator('.slot-grid button').first().click();
  await page.getByLabel('Nom complet').fill(prefix);
  await page.getByLabel('Téléphone', { exact: true }).fill('0612345678');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(page.getByText('DEMANDE ENREGISTRÉE')).toBeVisible();
  const receipt = await page.locator('.success').innerText();
  const reference = receipt.match(/GH-[A-F0-9]+/)![0];
  const manage = await page.locator('.private-link a').getAttribute('href');
  expect(manage).toContain('#');
  const booking = (
    await db
      .from('appointments')
      .select('id,status,total_minor')
      .eq('reference', reference)
      .single()
  ).data!;
  expect(booking.status).toBe('pending');
  expect(booking.total_minor).toBe(20000);
  await page.goto('/admin/login');
  await page.getByLabel('Adresse e-mail').fill(process.env.E2E_OWNER_EMAIL!);
  await page
    .getByLabel('Mot de passe', { exact: true })
    .fill(process.env.E2E_OWNER_PASSWORD!);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  for (const view of ['day', 'week', 'month', 'list']) {
    await page.goto(`/admin/calendar?date=${tomorrow}&view=${view}`);
    await expect(
      page.getByRole('heading', { name: 'Le calendrier', exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.calendar-event').filter({ hasText: prefix }).first(),
    ).toBeVisible();
  }
  await page.goto(`/admin/appointments?from=${tomorrow}&to=${tomorrow}`);
  await page
    .locator('.record')
    .filter({ hasText: reference })
    .getByRole('button', { name: 'Confirmé', exact: true })
    .click();
  await page.getByRole('button', { name: 'Confirmer', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db
            .from('appointments')
            .select('status')
            .eq('id', booking.id)
            .single()
        ).data?.status,
    )
    .toBe('confirmed');
  await page.goto('/admin/services');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  const name = `${prefix} new`;
  await page.getByLabel('Nom', { exact: true }).fill(name);
  await page
    .getByLabel('Adresse courte (slug)')
    .fill(`${prefix.toLowerCase()}-new`);
  await page
    .getByLabel('Catégorie', { exact: true })
    .selectOption(category!.id);
  await page.getByLabel('Durée (minutes)', { exact: true }).fill('20');
  await page.getByLabel('Type de prix').selectOption('fixed');
  await page.getByLabel(/Prix en centimes/).fill('3000');
  await page.getByLabel('Publier', { exact: true }).check();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Modifications enregistrées.')).toBeVisible();
  const created = (
    await db
      .from('services')
      .select('id')
      .eq('slug', `${prefix.toLowerCase()}-new`)
      .single()
  ).data!;
  await page
    .locator('.record')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .getByRole('button', { name: 'Modifier', exact: true })
    .click();
  await page.getByLabel(/Prix en centimes/).fill('3500');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db
            .from('services')
            .select('price_minor')
            .eq('id', created.id)
            .single()
        ).data?.price_minor,
    )
    .toBe(3500);
  await page.goto('/admin/offers');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await page.getByLabel('Titre', { exact: true }).fill(`${prefix} offer`);
  await page
    .getByLabel('Réduction', { exact: true })
    .selectOption('percentage');
  await page.getByLabel('Valeur (% ou centimes)').fill('10');
  const now = Temporal.Now.zonedDateTimeISO('Africa/Casablanca');
  await page
    .getByLabel('Début (Casablanca)')
    .fill(now.subtract({ days: 1 }).toPlainDateTime().toString().slice(0, 16));
  await page
    .getByLabel('Fin (Casablanca)')
    .fill(now.add({ days: 1 }).toPlainDateTime().toString().slice(0, 16));
  await page.getByLabel('Activer', { exact: true }).check();
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Modifications enregistrées.')).toBeVisible();
  const promotion = (
    await db
      .from('promotions')
      .select('id')
      .eq('name', `${prefix} offer`)
      .single()
  ).data!;
  await page.goto('/admin/eligibility');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await page.getByLabel('Offre', { exact: true }).selectOption(promotion.id);
  await page.getByLabel('Prestation', { exact: true }).selectOption(created.id);
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Modifications enregistrées.')).toBeVisible();
  await page.goto('/services');
  const publicCard = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(publicCard).toContainText(money(3150));
  await page.goto(manage!);
  await expect(page.getByRole('heading', { name: reference })).toBeVisible();
  await page.getByRole('button', { name: 'Demander l’annulation' }).click();
  await page.getByRole('button', { name: 'Confirmer l’annulation' }).click();
  await expect
    .poll(
      async () =>
        (
          await db
            .from('appointments')
            .select('status')
            .eq('id', booking.id)
            .single()
        ).data?.status,
    )
    .toBe('cancelled_by_customer');
  expect(
    (
      await db
        .from('allocations')
        .select('id', { count: 'exact', head: true })
        .eq('appointment_id', booking.id)
        .eq('active', true)
    ).count,
  ).toBe(0);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.goto('/admin/calendar');
  await expect(page).toHaveURL(/\/admin\/login$/);
  // Retain clearly named fixture records for diagnosis; reset the disposable project after testing.
});
