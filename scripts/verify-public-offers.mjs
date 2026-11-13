// Opt-in verification against the connected project. Creates one clearly labelled
// temporary offer through the existing authenticated admin API and removes it.
import { chromium, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
if (
  process.env.RUN_CONNECTED_ADMIN_CHECKS !== '1' ||
  !process.env.TEST_ADMIN_EMAIL ||
  !process.env.TEST_ADMIN_PASSWORD
)
  throw Error('Connected-test opt-in and admin credentials required.');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const name = `TEST-PUBLIC-OFFER-${randomUUID()}`;
const browser = await chromium.launch();
const page = await browser.newPage();
const publicPage = await browser.newPage();
let offerId;
const payload = {
  code: null,
  max_uses: null,
  name,
  description: 'Vérification temporaire — aucune promotion commerciale.',
  kind: 'percentage',
  value: 1,
  starts_at: new Date(Date.now() - 3600000).toISOString(),
  ends_at: new Date(Date.now() + 3600000).toISOString(),
  terms: 'TEST uniquement, supprimé après vérification.',
  active: false,
};
async function save(data, entity = 'offers') {
  const response = await page.request.post(`${base}/api/admin/${entity}`, {
    data,
    headers: { origin: base },
  });
  if (!response.ok())
    throw Error(`Admin save: ${response.status()} ${await response.text()}`);
}
async function visible(present) {
  for (const path of ['/', '/offres']) {
    await publicPage.goto(base + path);
    await expect(
      publicPage.getByRole('main').getByRole('heading', { name, exact: true }),
    ).toHaveCount(present ? 1 : 0);
  }
}
try {
  await page.goto(base + '/admin/login');
  await page.locator('input[type=email]').fill(process.env.TEST_ADMIN_EMAIL);
  await page
    .locator('input[type=password]')
    .fill(process.env.TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /connecter/i }).click();
  await page.waitForURL('**/admin');
  await save(payload);
  const { data, error } = await db
    .from('promotions')
    .select('id')
    .eq('name', name)
    .single();
  if (error) throw error;
  offerId = data.id;
  await visible(false);
  console.log('PASS inactive admin offer hidden on home and offers page');
  await save({ ...payload, id: offerId, active: true });
  await visible(true);
  console.log(
    'PASS newly activated admin offer appears on home and offers page without rebuilding',
  );
  await save({
    ...payload,
    id: offerId,
    active: true,
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 172800000).toISOString(),
  });
  await visible(true);
  await expect(
    publicPage
      .locator('.premium-offer-card')
      .filter({ hasText: name })
      .locator('.premium-offer-status'),
  ).toContainText('À venir');
  console.log('PASS future offer remains visible as coming soon');
  await save({ ...payload, id: offerId, active: true });
  const { data: catalogue, error: catalogueError } =
    await db.rpc('fatu_catalog');
  if (catalogueError) throw catalogueError;
  const service = catalogue.services.find(
    (s) => s.price_type === 'fixed' && s.price_minor !== null,
  );
  if (service) {
    await save(
      { promotion_id: offerId, service_id: service.id },
      'eligibility',
    );
    await publicPage.goto(base + '/services');
    await expect(
      publicPage.locator('.service-price small').filter({ hasText: name }),
    ).toHaveCount(1);
    console.log('PASS eligible service displays the real admin offer');
  } else
    console.log(
      'LIMIT no fixed-price public service for connected discounted-price check; covered by isolated browser fixture',
    );
  await save({
    ...payload,
    id: offerId,
    active: true,
    starts_at: new Date(Date.now() - 7200000).toISOString(),
    ends_at: new Date(Date.now() - 3600000).toISOString(),
  });
  await visible(false);
  console.log('PASS expired offer hidden on home and offers page');
} finally {
  // Narrow cleanup: only the unique test offer and its own associations.
  if (!offerId) {
    const { data } = await db
      .from('promotions')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    offerId = data?.id;
  }
  if (offerId) {
    const links = await db
      .from('promotion_services')
      .delete()
      .eq('promotion_id', offerId);
    if (links.error) throw links.error;
    const cleanup = await db
      .from('promotions')
      .delete()
      .eq('id', offerId)
      .eq('name', name);
    if (cleanup.error) throw cleanup.error;
    console.log('PASS temporary offer and its eligibility removed');
  }
  await browser.close();
}
