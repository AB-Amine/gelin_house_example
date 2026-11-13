// Explicit connected development verification. Uses temporary labelled records and restores edited content.
// Run only when authorised: RUN_CONNECTED_ADMIN_CHECKS=1, TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD.
import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
if (
  process.env.RUN_CONNECTED_ADMIN_CHECKS !== '1' ||
  !process.env.TEST_ADMIN_EMAIL ||
  !process.env.TEST_ADMIN_PASSWORD
)
  throw Error(
    'Explicit connected-test opt-in and administrator credentials required.',
  );
const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const marker = `TEST-DIARY-${randomUUID().slice(0, 8)}`;
const settingsKeys = [
  'name',
  'phone',
  'whatsapp',
  'address',
  'about',
  'hero_title',
  'hero_subtitle',
  'hero_image_path',
];
const state = {
  marker,
  appointments: [],
  uploads: [],
  gallery: [],
  steps: [],
  restored: false,
};
const digest = (v) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');
async function read(table, columns = '*') {
  const { data, error } = await db.from(table).select(columns);
  if (error) throw error;
  return data;
}
const originalSettings = (await read('salon_settings'))[0];
const originalServices = await read('services');
const originalCategories = await read('categories');
const originalAppointments = await read('appointments');
const existingHashes = new Map(
  originalAppointments.map((a) => [a.id, digest(a)]),
);
const originalHours = (await read('working_hours')).filter(
  (h) => h.resource_id === null,
);
const originals = {
  settings: Object.fromEntries(
    settingsKeys.map((k) => [k, originalSettings[k]]),
  ),
  hours: originalHours,
};
const service = originalServices.find(
  (s) =>
    s.published &&
    !s.archived &&
    !s.bookable &&
    s.service_type === 'appointment',
);
const category = originalCategories.find((c) => c.id === service.category_id);
const selected = originalServices
  .filter((s) => s.published && !s.archived && s.service_type === 'appointment')
  .slice(0, 2);
if (!service || !category || selected.length !== 2)
  throw Error('Suitable catalogue records missing.');
const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(30000);
const publicPage = await browser.newPage();
publicPage.setDefaultTimeout(18000);
async function post(path, data) {
  const r = await page.request.post(`${base}${path}`, {
    data,
    headers: { origin: base },
  });
  const body = await r.json();
  if (!r.ok()) throw Error(`${path}: ${body.error ?? r.status()}`);
  return body;
}
async function saveForm() {
  const response = page.waitForResponse(
    (r) => r.url().includes('/api/admin/') && r.request().method() === 'POST',
  );
  await page
    .getByRole('main')
    .locator('form.admin-form')
    .getByRole('button', { name: 'Enregistrer', exact: true })
    .click();
  const r = await response;
  if (r.status() !== 200)
    throw Error('Admin form save failed: ' + JSON.stringify(await r.json()));
}
function passed(text) {
  state.steps.push(text);
  console.log('PASS ' + text);
}
try {
  await page.goto(`${base}/admin/login`);
  await page.locator('input[type=email]').fill(process.env.TEST_ADMIN_EMAIL);
  await page
    .locator('input[type=password]')
    .fill(process.env.TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /connecter/i }).click();
  await page.waitForURL('**/admin');
  let form, card, booking;
  if (process.env.SKIP_DIARY_CHECKS !== '1') {
    // Full customer request → one-click confirmation, with no duration input.
    const date = new Date(Date.now() + 40 * 86400000)
      .toISOString()
      .slice(0, 10);
    await publicPage.goto(`${base}/reservation?prestation=${selected[0].slug}`);
    form = publicPage.locator('.appointment-request-form');
    await form.locator('select').selectOption(selected[1].id);
    await form.locator('[name=date]').fill(date);
    await form.locator('[name=time]').fill('13:07');
    await form.locator('[name=name]').fill(marker);
    await form.locator('[name=phone]').fill('+212612345678');
    await form.locator('[name=consent]').check();
    await form
      .getByRole('button', { name: 'Envoyer ma demande', exact: true })
      .click();
    await expect(
      publicPage.getByRole('main').getByRole('status'),
    ).toContainText('en attente de confirmation');
    await page.goto(`${base}/admin`);
    card = page.locator('.website-request-card').filter({ hasText: marker });
    await card.getByRole('button', { name: 'Confirmer', exact: true }).click();
    await expect(card.getByRole('status')).toContainText(
      'ajouté au calendrier',
    );
    const req = (await read('contact_messages')).find((r) => r.name === marker);
    if (!req?.appointment_id) throw Error('Request not linked');
    state.appointments.push(req.appointment_id);
    booking = (await read('appointments')).find(
      (a) => a.id === req.appointment_id,
    );
    if (
      booking.scheduling_mode !== 'diary' ||
      booking.ends_at !== booking.starts_at
    )
      throw Error('Diary marker invalid');
    passed('customer request confirmed without duration/end-time input');
    await page.goto(`${base}/admin/calendar?date=${date}&view=day`);
    await expect(
      page.locator('.calendar-event').filter({ hasText: marker }),
    ).toBeVisible();
    passed('confirmed entry appears in real calendar');
    await page.locator('.calendar-event').filter({ hasText: marker }).click();
    await page
      .getByRole('button', { name: 'Modifier la date ou l’heure' })
      .click();
    await page.locator('input[name=start]').fill(`${date}T14:09`);
    await page
      .locator('#appointment-action')
      .getByRole('button', { name: 'Enregistrer', exact: true })
      .click();
    await expect(page.locator('#appointment-action')).toHaveCount(0);
    booking = (await read('appointments')).find(
      (a) => a.id === req.appointment_id,
    );
    if (
      new Intl.DateTimeFormat('fr-FR', {
        timeZone: originalSettings.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(booking.starts_at)) !== '14:09'
    )
      throw Error('Unexpected Casablanca reschedule');
    passed('appointment start changes through admin details');
    await page
      .getByRole('button', { name: 'Annuler le rendez-vous', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Confirmer l’annulation', exact: true })
      .click();
    await expect(page.locator('#appointment-action')).toHaveCount(0);
    await page.goto(`${base}/admin/calendar?date=${date}&view=day`);
    await expect(
      page.locator('.calendar-event').filter({ hasText: marker }),
    ).toHaveCount(0);
    passed(
      'cancelled booking retained in Supabase and removed from active calendar',
    );
    await page.goto(`${base}/admin/appointments/new`);
    form = page.locator('.appointment-request-form');
    await form.locator('select').selectOption(selected[0].id);
    await form.locator('[name=date]').fill(date);
    await form.locator('[name=time]').fill('14:09');
    await form.locator('[name=name]').fill(marker + '-MANUAL');
    await form.locator('[name=phone]').fill('+212612345678');
    await form
      .getByRole('button', { name: 'Enregistrer le rendez-vous', exact: true })
      .click();
    await expect(page.getByRole('main').getByRole('status')).toContainText(
      'enregistré dans le calendrier',
    );
    const customer = (await read('customers')).find(
      (c) => c.name === marker + '-MANUAL',
    );
    const manual = (await read('appointments')).find(
      (a) => a.customer_id === customer?.id,
    );
    if (!manual) throw Error('Manual booking missing');
    state.appointments.push(manual.id);
    passed('one-page manual form reuses cancelled exact start');
    await post('/api/admin/appointments', {
      id: manual.id,
      action: 'cancelled_by_salon',
      reason: 'Temporary verification completed',
    });
  }
  // Real UI → API → Supabase → public page verification.
  if (process.env.CONTENT_PHASE !== 'catalogue') {
    await page.goto(`${base}/admin/settings`);
    form = page.locator('form.admin-form');
    await form.getByLabel('Nom', { exact: true }).fill(marker + ' SALON');
    await form.getByLabel('Téléphone', { exact: true }).fill('+212612345678');
    await form.getByLabel('WhatsApp', { exact: true }).fill('+212612345679');
    await form
      .getByLabel('Adresse', { exact: true })
      .fill('TEST adresse de synchronisation, Khouribga');
    await saveForm();
    await publicPage.goto(`${base}/contact`);
    await expect(
      publicPage.locator('.fatu-header .fatu-wordmark'),
    ).toContainText(marker);
    await expect(publicPage.locator('.fatu-contact-grid aside')).toContainText(
      'TEST adresse de synchronisation',
    );
    await expect(
      publicPage.locator('a[href="tel:+212612345678"]').first(),
    ).toBeVisible();
    await expect(
      publicPage.locator('a[href="https://wa.me/212612345679"]'),
    ).toBeVisible();
    passed('salon name, phone, WhatsApp and address update on public pages');
    await page.goto(`${base}/admin/settings?view=website`);
    form = page.locator('form.admin-form');
    await form
      .getByLabel('Titre de l’accueil', { exact: true })
      .fill(marker + ' TITRE');
    await form
      .getByLabel('Sous-titre de l’accueil', { exact: true })
      .fill(marker + ' SOUS-TITRE');
    await form
      .getByLabel('Présentation du salon', { exact: true })
      .fill(marker + ' PRESENTATION');
    let upload = page.waitForResponse((r) =>
      r.url().endsWith('/api/admin/upload'),
    );
    await form
      .locator('input[type=file]')
      .setInputFiles('public/images/services/artistry-320.webp');
    let image = await (await upload).json();
    if (!image.path) throw Error('Hero upload failed');
    state.uploads.push(image.path);
    await saveForm();
    await publicPage.goto(base);
    await expect(publicPage.locator('.fatu-hero h1')).toContainText(
      marker + ' TITRE',
    );
    await expect(publicPage.locator('.fatu-hero-copy > p')).toContainText(
      marker + ' SOUS-TITRE',
    );
    await expect(publicPage.locator('.fatu-about-band')).toContainText(
      marker + ' PRESENTATION',
    );
    await expect(publicPage.locator('.fatu-hero img')).toHaveAttribute(
      'src',
      new RegExp(image.path),
    );
    await expect(publicPage.locator('.fatu-hero img')).toHaveJSProperty(
      'complete',
      true,
    );
    if (
      (
        await publicPage.request.get(
          await publicPage.locator('.fatu-hero img').getAttribute('src'),
        )
      ).status() !== 200
    )
      throw Error('Stored image URL failed');
    passed(
      'homepage title, subtitle, about text and uploaded hero photo synchronize',
    );
    await page.goto(`${base}/admin/portfolio?new=1`);
    form = page.locator('form.admin-form');
    upload = page.waitForResponse((r) => r.url().endsWith('/api/admin/upload'));
    await form
      .locator('input[type=file]')
      .setInputFiles('public/images/services/artistry-320.webp');
    image = await (await upload).json();
    state.uploads.push(image.path);
    await form
      .getByLabel('Description de la photo pour l’accessibilité', {
        exact: true,
      })
      .fill(marker + ' PHOTO');
    await form.getByLabel('Titre', { exact: true }).fill(marker + ' PHOTO');
    await form.getByLabel('Afficher sur le site', { exact: true }).check();
    await form
      .getByLabel('Autorisation de publication confirmée', { exact: true })
      .check();
    await saveForm();
    const photo = (await read('gallery')).find((g) => g.path === image.path);
    if (!photo) throw Error('Gallery record missing');
    state.gallery.push(photo.id);
    await publicPage.goto(`${base}/portfolio`);
    await expect(
      publicPage.locator(`.fatu-portfolio-grid img[src*="${image.path}"]`),
    ).toBeVisible();
    passed('uploaded published gallery photo reaches public gallery');
  }
  await page.goto(`${base}/admin/services`);
  await page
    .locator('.admin-record-card')
    .filter({
      has: page.getByRole('heading', { name: service.name, exact: true }),
    })
    .getByRole('button', { name: 'Modifier', exact: true })
    .click();
  form = page.locator('form.admin-form');
  await form.getByLabel('Nom', { exact: true }).fill(marker + ' SERVICE');
  await form
    .locator('select')
    .filter({ has: page.locator('option[value="fixed"]') })
    .selectOption('fixed');
  await form.getByLabel('Prix (MAD)', { exact: true }).fill('123.45');
  await saveForm();
  await publicPage.goto(`${base}/services`);
  card = publicPage
    .locator('.official-service-card')
    .filter({ hasText: marker + ' SERVICE' });
  await expect(card).toContainText(/123[,.]45/);
  passed('service name and price edited through admin reach public catalogue');
  await db.from('services').update({ published: false }).eq('id', service.id);
  await publicPage.reload();
  await expect(
    publicPage.getByRole('heading', { name: marker + ' SERVICE', exact: true }),
  ).toHaveCount(0);
  await db
    .from('services')
    .update({ published: service.published })
    .eq('id', service.id);
  await db
    .from('categories')
    .update({ published: false })
    .eq('id', category.id);
  await publicPage.reload();
  await expect(
    publicPage.getByRole('button', { name: category.name, exact: true }),
  ).toHaveCount(0);
  await db
    .from('categories')
    .update({ published: category.published })
    .eq('id', category.id);
  passed('service/category publication flags control public visibility');
  await page.goto(`${base}/admin/availability`);
  form = page.locator('form.admin-form');
  const opens = originalHours[0].opens.slice(0, 5);
  const [h, m] = opens.split(':').map(Number);
  const earlier =
    h * 60 + m > 0
      ? `${String(Math.floor((h * 60 + m - 1) / 60)).padStart(2, '0')}:${String((h * 60 + m - 1) % 60).padStart(2, '0')}`
      : opens;
  await form.getByLabel('Ouverture', { exact: true }).first().fill(earlier);
  await form.getByRole('button', { name: 'Enregistrer les horaires' }).click();
  await expect(page.getByRole('status')).toContainText('horaires enregistrés');
  await publicPage.goto(`${base}/contact`);
  await expect(publicPage.locator('.fatu-contact-grid aside')).toContainText(
    earlier,
  );
  passed('opening-hours save reaches the public contact display');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/admin/appointments/new`);
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error('Mobile form overflow');
  await page.screenshot({ path: '.tools/diary-mobile.png', fullPage: true });
  passed('manual form mobile width');
} finally {
  const testCustomers = (await read('customers'))
    .filter((c) => c.name.startsWith(marker))
    .map((c) => c.id);
  for (const a of await read('appointments'))
    if (
      testCustomers.includes(a.customer_id) &&
      !state.appointments.includes(a.id)
    )
      state.appointments.push(a.id);
  for (const id of state.appointments) {
    const { error } = await db.rpc('change_booking', {
      p_id: id,
      p_action: 'cancelled_by_salon',
      p_actor: (await read('admin_profiles')).find(
        (a) => a.active && a.role === 'owner',
      ).id,
      p_reason: 'Temporary verification completed',
    });
    if (error && !error.message.includes('INVALID_TRANSITION'))
      console.error('Test cancellation needs review.');
  }
  await db.from('salon_settings').update(originals.settings).eq('id', 1);
  await db
    .from('services')
    .update({
      name: service.name,
      price_type: service.price_type,
      price_minor: service.price_minor,
      published: service.published,
    })
    .eq('id', service.id);
  await db
    .from('categories')
    .update({ published: category.published })
    .eq('id', category.id);
  for (const id of state.gallery)
    await db.from('gallery').delete().eq('id', id);
  if (state.uploads.length)
    await db.storage.from('salon-images').remove(state.uploads);
  if (page.url().startsWith(base)) {
    const day = originalHours[0]?.weekday;
    await post('/api/admin/daily-hours', {
      days: [...new Set(originalHours.map((h) => h.weekday))],
      hours: originalHours
        .filter((h) => h.weekday === day)
        .map((h) => ({
          opens: h.opens.slice(0, 5),
          closes: h.closes.slice(0, 5),
        })),
    });
  }
  const now = await read('appointments');
  for (const [id, hash] of existingHashes)
    if (digest(now.find((a) => a.id === id)) !== hash)
      throw Error('An existing appointment changed.');
  const settings = (await read('salon_settings'))[0];
  for (const key of settingsKeys)
    if (settings[key] !== originals.settings[key])
      throw Error('Content restoration failed: ' + key);
  state.restored = true;
  await writeFile(
    '.tools/connected-simplification-results.json',
    JSON.stringify(state, null, 2),
  );
  await browser.close();
  console.log(
    'Restored original public content and removed test photo uploads. Labelled test appointments remain cancelled in history. Existing appointments unchanged.',
  );
}
