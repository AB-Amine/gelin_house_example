import { test, expect } from '@playwright/test';

test('visual and detailed calendars share start times, filters and guest records without writes', async ({
  page,
}, info) => {
  if (info.project.name === 'chromium')
    await page.setViewportSize({ width: 1672, height: 1000 });
  const writes: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', (route) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.request().method())) {
      writes.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(
    '/admin/preview?section=calendar&date=2026-11-18&view=week&q=Test',
  );
  const fixture = [
    {
      reference: 'TEST-GUEST',
      local_start: '2026-11-18T14:15',
      starts_at: '2026-11-18T13:15:00Z',
      ends_at: '2026-11-18T13:15:00Z',
      status: 'confirmed',
      customers: { name: 'Test · Cliente invitée', phone: '+212600000001' },
      appointment_items: [
        { name: 'Manucure', resource_id: '', resources: null },
      ],
    },
    {
      reference: 'TEST-CLOSE',
      local_start: '2026-11-18T14:30',
      starts_at: '2026-11-18T13:30:00Z',
      ends_at: '2026-11-18T13:30:00Z',
      status: 'pending',
      customers: { name: 'Test · Autre cliente', phone: '+212600000002' },
      appointment_items: [
        { name: 'Coiffure', resource_id: '', resources: null },
      ],
    },
    {
      reference: 'TEST-LATE',
      local_start: '2026-11-19T23:59',
      starts_at: '2026-11-19T22:59:00Z',
      ends_at: '2026-11-19T22:59:00Z',
      status: 'confirmed',
      customers: { name: 'Test · Rendez-vous tardif', phone: '' },
      appointment_items: [],
    },
  ];
  await page.evaluate(
    (calendar) =>
      localStorage.setItem(
        'fatu-admin-preview-v1',
        JSON.stringify({
          calendar,
          working_hours: [
            { resource_id: null, weekday: 3, opens: '09:00', closes: '18:00' },
          ],
        }),
      ),
    fixture,
  );
  await page.reload();
  const visual = page.getByRole('region', {
    name: 'Calendrier visuel',
    exact: true,
  });
  await expect(visual).toBeVisible();
  const guest = visual.getByRole('button', {
    name: /Test · Cliente invitée · 14:15/,
  });
  if ((info.project.use.viewport?.width ?? 1280) <= 1000)
    await page
      .getByRole('group', { name: 'Jour à afficher' })
      .getByRole('button', { name: /18/ })
      .click();
  await guest.click();
  const panel = page.getByRole('complementary', {
    name: 'Détails du rendez-vous',
  });
  await expect(panel).toContainText('Manucure');
  await expect(panel).toContainText('14:15');
  await expect(panel.getByRole('link', { name: /Ouvrir/ })).toHaveAttribute(
    'href',
    /reference=TEST-GUEST/,
  );
  expect(await guest.evaluate((node) => node.style.top)).toBe('378px');
  const other = visual.getByRole('button', {
    name: /Test · Autre cliente · 14:30/,
  });
  expect(await guest.evaluate((node) => node.style.left)).not.toBe(
    await other.evaluate((node) => node.style.left),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath('vue-calendrier.png'),
    fullPage: true,
  });
  await page.evaluate(() => {
    (window as unknown as { calendarMarker: string }).calendarMarker =
      'unchanged';
  });
  await page
    .getByRole('button', { name: 'Vue détaillée', exact: true })
    .click();
  await expect(visual).toHaveCount(0);
  await expect(
    page
      .locator('.calendar-event')
      .filter({ hasText: 'Test · Cliente invitée' }),
  ).toBeVisible();
  await expect(page.getByRole('searchbox')).toHaveValue('Test');
  expect(new URL(page.url()).searchParams.get('date')).toBe('2026-11-18');
  expect(
    await page.evaluate(
      () => (window as unknown as { calendarMarker: string }).calendarMarker,
    ),
  ).toBe('unchanged');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath('vue-detaillee.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Vue calendrier', exact: true })
    .click();
  await expect(panel).toContainText('TEST-GUEST');
  await visual
    .getByRole('link', { name: 'Semaine suivante', exact: true })
    .click();
  await expect(page).toHaveURL(/date=2026-11-25/);
  await expect(page).toHaveURL(/q=Test/);
  await expect(visual).toContainText('Aucun rendez-vous sur cette période.');
  await visual.getByRole('link', { name: 'Jour', exact: true }).click();
  await expect(page).toHaveURL(/view=day/);
  await visual
    .getByRole('link', { name: 'Jour précédent', exact: true })
    .click();
  await expect(page).toHaveURL(/date=2026-11-24/);
  await visual.getByRole('link', { name: 'Aujourd’hui', exact: true }).click();
  await expect(page).not.toHaveURL(/date=2026-11-24/);
  await expect(visual.locator('[data-today="true"]')).toHaveCount(2);
  await page
    .getByRole('button', { name: 'Vue détaillée', exact: true })
    .click();
  await page.getByRole('combobox').selectOption('month');
  await page.getByRole('button', { name: 'Filtrer', exact: true }).click();
  await expect(page).toHaveURL(/view=month/);
  await expect(page).toHaveURL(/display=details/);
  await page.locator('.calendar-date').filter({ hasText: /^18$/ }).click();
  await expect(page).toHaveURL(/view=day/);
  await expect(page).toHaveURL(/display=details/);
  await expect(page.getByRole('searchbox')).toHaveValue('Test');
  await page.getByRole('combobox').selectOption('month');
  await page.getByRole('button', { name: 'Filtrer', exact: true }).click();
  await page
    .getByRole('button', { name: 'Vue calendrier', exact: true })
    .click();
  await expect(page).toHaveURL(/view=week/);
  await expect(page).toHaveURL(/display=calendar/);
  await expect(page).toHaveURL(/q=Test/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('fatu-admin-preview-v1') ?? '{}')
          .calendar,
    ),
  ).toEqual(fixture);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});

test('both calendar presentations reflect weekday hours, exceptions, closures and later edits', async ({
  page,
}, info) => {
  await page.goto('/admin/preview?section=calendar&date=2026-11-18&view=week');
  const appointment = {
    reference: 'TEST-HOURS',
    local_start: '2026-11-18T14:15',
    starts_at: '2026-11-18T13:15:00Z',
    ends_at: '2026-11-18T13:15:00Z',
    status: 'confirmed',
    customers: { name: 'TEST · Horaire conservé', phone: '' },
    appointment_items: [],
  };
  await page.evaluate(
    (calendar) =>
      localStorage.setItem(
        'fatu-admin-preview-v1',
        JSON.stringify({
          calendar: [calendar],
          working_hours: [
            { resource_id: null, weekday: 1, opens: '10:15', closes: '21:45' },
            { resource_id: null, weekday: 3, opens: '11:00', closes: '17:00' },
          ],
          exceptions: [
            {
              resource_id: null,
              day: '2026-11-18',
              opens: '12:30',
              closes: '15:00',
            },
          ],
          closures: [
            {
              resource_id: null,
              starts_at: '2026-11-18T12:00:00Z',
              ends_at: '2026-11-18T13:00:00Z',
              local_start: '2026-11-18T13:00',
              local_end: '2026-11-18T14:00',
              reason: 'TEST · Fermeture',
            },
          ],
        }),
      ),
    appointment,
  );
  await page.reload();
  const visual = page.getByRole('region', {
    name: 'Calendrier visuel',
    exact: true,
  });
  await expect(visual).toContainText('10:15–21:45');
  await expect(visual).toContainText('12:30–13:00 · 14:00–15:00');
  await expect(visual).toContainText('Fermé');
  expect(
    await visual
      .locator('[data-day="2026-11-17"]')
      .evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe('rgb(237, 231, 233)');
  await expect(visual.getByText('09:00', { exact: true })).toHaveCount(0);
  if ((info.project.use.viewport?.width ?? 1280) <= 1000)
    await page
      .getByRole('group', { name: 'Jour à afficher' })
      .getByRole('button', { name: /18/ })
      .click();
  const card = visual.getByRole('button', { name: /TEST · Horaire conservé/ });
  await card.click();
  await expect(card).toHaveAttribute('data-outside', 'false');
  // Simulate a saved schedule edit in browser-local preview; appointment is untouched.
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('fatu-admin-preview-v1')!);
    data.exceptions[0].closes = '13:00';
    localStorage.setItem('fatu-admin-preview-v1', JSON.stringify(data));
    window.dispatchEvent(new Event('fatu-preview-change'));
  });
  await expect(card).toHaveAttribute('data-outside', 'true');
  await expect(
    page.getByRole('complementary', { name: 'Détails du rendez-vous' }),
  ).toContainText('Ce rendez-vous est conservé');
  await page
    .getByRole('button', { name: 'Vue détaillée', exact: true })
    .click();
  const detailed = page
    .locator('.calendar-event')
    .filter({ hasText: 'TEST · Horaire conservé' });
  await expect(detailed).toContainText('Hors horaires du salon');
  await expect(
    page.locator('.calendar-hours').filter({ hasText: '12:30–13:00' }),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('fatu-admin-preview-v1')!).calendar,
    ),
  ).toEqual([appointment]);
});
