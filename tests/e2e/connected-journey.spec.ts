import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Temporal } from '@js-temporal/polyfill';

// Writes only run when explicitly pointed at a disposable Supabase project.
test('Fatu guest booking, client ownership, admin confirmation and reviewed cancellation', async ({
  browser,
  page,
  baseURL,
}) => {
  test.skip(
    process.env.E2E_DATABASE_ISOLATED !== 'true' ||
      !process.env.E2E_OWNER_EMAIL ||
      !process.env.E2E_OWNER_PASSWORD ||
      !process.env.SUPABASE_SECRET_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'Requires an isolated Supabase project, applied migrations and provisioned test admin.',
  );
  test.setTimeout(180000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret = process.env.SUPABASE_SECRET_KEY!,
    publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const db = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const prefix = `TEST-${randomUUID().slice(0, 8)}`;
  const password = `Test!${randomUUID()}Aa1`;
  const email = `${prefix.toLowerCase()}@example.test`;
  const now = Temporal.Now.zonedDateTimeISO('Africa/Casablanca');
  const day = now.add({ days: 21 }).toPlainDate().toString();
  const resource = (
    await db
      .from('resources')
      .insert({ name: prefix, kind: 'staff' })
      .select('id')
      .single()
  ).data;
  expect(resource).not.toBeNull();
  const service = (
    await db
      .from('services')
      .insert({
        name: `${prefix} makeup`,
        slug: prefix.toLowerCase(),
        duration_minutes: 60,
        price_minor: 20000,
        published: true,
        bookable: true,
        featured: true,
      })
      .select('id,name')
      .single()
  ).data;
  expect(service).not.toBeNull();
  const city = (
    await db
      .from('cities')
      .insert({
        name: `${prefix} city`,
        slug: `${prefix.toLowerCase()}-city`,
        travel_fee_minor: 2500,
        active: true,
      })
      .select('id')
      .single()
  ).data;
  expect(city).not.toBeNull();
  for (const [table, rows] of [
    [
      'qualifications',
      [{ service_id: service!.id, resource_id: resource!.id }],
    ],
    ['service_cities', [{ service_id: service!.id, city_id: city!.id }]],
    [
      'city_hours',
      Array.from({ length: 7 }, (_, weekday) => ({
        city_id: city!.id,
        weekday,
        opens: '09:00',
        closes: '18:00',
      })),
    ],
    [
      'working_hours',
      Array.from({ length: 7 }, (_, weekday) => ({
        resource_id: resource!.id,
        weekday,
        opens: '09:00',
        closes: '18:00',
      })),
    ],
    [
      'opening_exceptions',
      [{ resource_id: null, day, opens: '09:00', closes: '18:00' }],
    ],
  ] as [string, Record<string, unknown>[]][]) {
    const { error } = await db.from(table).insert(rows);
    expect(error, table).toBeNull();
  }
  expect(
    (
      await db
        .from('salon_settings')
        .update({
          name: 'Fatu Makeup Artist',
          approved: true,
          booking_enabled: true,
          phone: '+212612345678',
          timezone: 'Africa/Casablanca',
          currency: 'MAD',
          privacy_text: 'TEST ONLY privacy policy',
          policy_text:
            'TEST ONLY pending requests require administrator confirmation',
          notice_minutes: 0,
          horizon_days: 60,
          cancellation_enabled: true,
          rescheduling_enabled: true,
          cancellation_notice_hours: 0,
          rescheduling_notice_hours: 0,
        })
        .eq('id', 1)
    ).error,
  ).toBeNull();
  const user = (
    await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: `${prefix} client` },
    })
  ).data.user;
  expect(user).not.toBeNull();
  const other = (
    await db.auth.admin.createUser({
      email: `other-${email}`,
      password,
      email_confirm: true,
    })
  ).data.user;
  expect(other).not.toBeNull();
  await page.goto('/services');
  await page.getByRole('searchbox').fill(prefix);
  await page
    .getByRole('button', { name: 'Choisir cette prestation', exact: true })
    .click();
  await page.goto('/reservation');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page
    .getByRole('combobox', { name: 'Choisir une ville', exact: true })
    .selectOption(city!.id);
  await page
    .getByRole('textbox', { name: 'Adresse de l’événement', exact: true })
    .fill('TEST ONLY event address');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByLabel('Votre créneau', { exact: true }).fill(day);
  await page.getByRole('button', { name: 'Rechercher', exact: true }).click();
  await page.locator('.slot-grid button').first().click();
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page
    .getByRole('textbox', { name: 'Nom complet', exact: true })
    .fill(`${prefix} client`);
  await page
    .getByRole('textbox', { name: 'Téléphone', exact: true })
    .fill('+212612345678');
  await page
    .getByRole('textbox', { name: 'Adresse e-mail', exact: true })
    .fill(email);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Continuer/ }).click();
  await expect(page.locator('.fatu-summary')).toContainText(
    'Frais de déplacement',
  );
  await page.getByRole('button', { name: /Envoyer ma demande/ }).click();
  await expect(page.locator('.fatu-receipt')).toBeVisible();
  const manage = await page
    .locator('.fatu-receipt a[href*="gestion#"]')
    .getAttribute('href');
  expect(manage).toMatch(/#[a-f0-9]{64}$/);
  const booking = (
    await db
      .from('appointments')
      .select('id,reference,status,total_minor,travel_fee_minor,client_user_id')
      .eq('event_address', 'TEST ONLY event address')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
  ).data!;
  expect(booking.status).toBe('pending');
  expect(booking.total_minor).toBe(22500);
  expect(booking.travel_fee_minor).toBe(2500);
  expect(booking.client_user_id).toBeNull();
  await page.goto('/client/login');
  await page
    .getByRole('textbox', { name: 'Adresse e-mail', exact: true })
    .fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(password);
  await page.getByRole('button', { name: /Se connecter/ }).click();
  await expect(page).toHaveURL(/\/client$/);
  await page.goto(manage!);
  await page
    .getByRole('button', {
      name: 'Associer cette demande à mon compte',
      exact: true,
    })
    .click();
  await expect(
    page.getByText('La demande a été associée à votre compte.'),
  ).toBeVisible();
  await page.goto('/client/bookings');
  await expect(
    page.getByText(booking.reference, { exact: true }),
  ).toBeVisible();
  const otherClient = createClient(url, publicKey, {
    auth: { persistSession: false },
  });
  expect(
    (
      await otherClient.auth.signInWithPassword({
        email: `other-${email}`,
        password,
      })
    ).error,
  ).toBeNull();
  expect((await otherClient.rpc('client_bookings')).data).toEqual([]);
  expect((await otherClient.from('appointments').select('*')).data).toEqual([]);
  expect(
    (
      await otherClient.rpc('client_request', {
        p_id: booking.id,
        p_kind: 'cancel',
        p_reason: 'Forbidden fixture',
      })
    ).error,
  ).not.toBeNull();
  const adminContext = await browser.newContext({ baseURL });
  try {
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/admin/login');
    await adminPage
      .getByRole('textbox', { name: 'Adresse e-mail', exact: true })
      .fill(process.env.E2E_OWNER_EMAIL!);
    await adminPage
      .getByLabel('Mot de passe', { exact: true })
      .fill(process.env.E2E_OWNER_PASSWORD!);
    await adminPage
      .getByRole('button', { name: 'Se connecter', exact: true })
      .click();
    await expect(adminPage).toHaveURL(/\/admin$/);
    await adminPage.goto(`/admin/bookings?reference=${booking.reference}`);
    await adminPage
      .getByRole('button', { name: 'Confirmé', exact: true })
      .click();
    await adminPage
      .getByRole('button', { name: 'Confirmer', exact: true })
      .click();
    await expect(adminPage.locator('.record .badge')).toHaveText('Confirmé');
    await page.reload();
    await page
      .getByRole('button', { name: 'Demander une annulation', exact: true })
      .click();
    await page
      .getByRole('textbox', { name: 'Motif / précisions', exact: true })
      .fill('TEST ONLY cancellation request');
    await page
      .getByRole('button', { name: 'Envoyer ma demande', exact: true })
      .click();
    await expect(
      page.getByText(
        'Votre demande a été enregistrée et attend la réponse de Fatu.',
      ),
    ).toBeVisible();
    expect(
      (
        await db
          .from('appointments')
          .select('status')
          .eq('id', booking.id)
          .single()
      ).data?.status,
    ).toBe('confirmed');
    await adminPage.goto('/admin/requests');
    const requestCard = adminPage
      .locator('article')
      .filter({ hasText: booking.reference });
    await requestCard
      .getByRole('button', { name: 'Accepter la demande' })
      .click();
    await expect(requestCard).toContainText('Acceptée');
    expect(
      (
        await db
          .from('appointments')
          .select('status')
          .eq('id', booking.id)
          .single()
      ).data?.status,
    ).toBe('cancelled_by_customer');
    expect(
      (
        await db
          .from('allocations')
          .select('id', { count: 'exact', head: true })
          .eq('appointment_id', booking.id)
          .eq('active', true)
      ).count,
    ).toBe(0);
    const imagePath = `gallery/${randomUUID()}.webp`;
    expect(
      (
        await db.storage
          .from('salon-images')
          .upload(
            imagePath,
            await readFile('public/images/portfolio/editorial-colour-720.webp'),
            { contentType: 'image/webp' },
          )
      ).error,
    ).toBeNull();
    expect(
      (
        await db
          .from('gallery')
          .insert({
            path: imagePath,
            alt: `${prefix} licensed test photograph`,
            album: prefix,
            published: true,
            consent_confirmed: true,
            temporary: false,
          })
      ).error,
    ).toBeNull();
    await page.goto('/portfolio');
    await page.getByRole('button', { name: prefix, exact: true }).click();
    await page
      .getByRole('button', {
        name: new RegExp(`${prefix} licensed test photograph`),
      })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await adminPage
      .getByRole('button', { name: 'Se déconnecter', exact: true })
      .click();
    await expect(adminPage).toHaveURL(/\/admin\/login$/);
  } finally {
    await adminContext.close();
  }
  // Clearly named fixtures are retained for diagnosis. Reset this disposable project after testing.
});
