// Real CRUD client components; synthetic records and mocked local APIs only.
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url)),
  fixture = path.join(root, '.tools/expanded-ui');
await mkdir(fixture, { recursive: true });
await writeFile(
  path.join(fixture, 'index.html'),
  '<html lang="fr"><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>',
);
await writeFile(
  path.join(fixture, 'navigation.js'),
  `export const useRouter=()=>({refresh(){window.dispatchEvent(new Event('fixture-refresh'));window.fixtureRefreshes=(window.fixtureRefreshes||0)+1;},replace(){},push(){}});`,
);
await writeFile(
  path.join(fixture, 'link.jsx'),
  `import React from 'react';export default props=>React.createElement('a',props);`,
);
await writeFile(
  path.join(fixture, 'main.jsx'),
  `
import React from 'react';import {createRoot} from 'react-dom/client';
import {LocaleProvider} from '@/components/locale-provider';import {FatuAppointments} from '@/components/fatu-appointments';
import {PermanentDelete} from '@/components/permanent-delete';import {AccountDeletionJobs} from '@/components/account-deletion-jobs';
import '@/app/globals.css';import '@/app/fatu.css';import '@/app/admin/admin.css';import '@/app/admin/admin-premium.css';
const params=new URLSearchParams(location.search),kind=params.get('kind')||'appointments',scenario=params.get('case')||'confirmed';
const row={id:'00000000-0000-4000-8000-000000000001',reference:'TEST-RDV',starts_at:scenario==='completed'?'2020-01-01T10:00Z':'2099-01-01T10:00Z',ends_at:scenario==='completed'?'2020-01-01T11:00Z':'2099-01-01T11:00Z',status:scenario,total_minor:0,uncertain:false,source:'other',notes:'',internal_notes:'',created_at:'2020-01-01T00:00Z',customers:{name:'TEST Cliente',phone:'',email:null},appointment_items:[],currency:'MAD',city_name:null,event_address:'',event_details:'',travel_fee_minor:0};
function Fixture(){const[removed,setRemoved]=React.useState(false),[success,setSuccess]=React.useState('');
React.useEffect(()=>{const refresh=()=>{if(scenario!=='pending-auth')setRemoved(true)};window.addEventListener('fixture-refresh',refresh);return()=>window.removeEventListener('fixture-refresh',refresh)},[]);
return <LocaleProvider locale="fr"><div className="salon-admin">{success&&<p role="status">{success}</p>}
{scenario==='retry'?<AccountDeletionJobs jobs={removed?[]:[{id:row.id,jobId:'00000000-0000-4000-8000-000000000009',name:'TEST compte',state:'application_deleted'}]}/>:kind==='appointments'?<FatuAppointments rows={removed?[]:[row]} timezone="Africa/Casablanca" asOf={Date.parse('2026-11-16T12:00Z')}/>:!removed&&<PermanentDelete entity={kind} id={row.id} name="TEST élément" onDeleted={()=>setSuccess('TEST succès confirmé')}/>}
</div></LocaleProvider>};createRoot(document.getElementById('root')).render(<Fixture/>);`,
);
const server = await createServer({
  root: fixture,
  publicDir: path.join(root, 'public'),
  configFile: false,
  envDir: fixture,
  cacheDir: path.join(root, '.tools/vite-expanded-cache'),
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': path.join(root, 'src'),
      'next/navigation': path.join(fixture, 'navigation.js'),
      'next/link': path.join(fixture, 'link.jsx'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3142,
    strictPort: true,
    fs: { allow: [root] },
  },
  plugins: [
    {
      name: 'deny-unmocked-api',
      configureServer(vite) {
        vite.middlewares.use('/api', (_req, res) => {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end('{"error":"UNMOCKED TEST REQUEST"}');
        });
      },
    },
  ],
});
let browser,
  passed = 0;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
    });
    await context.route('**/*', (route) =>
      route.request().url().startsWith('http://127.0.0.1:3142')
        ? route.continue()
        : route.abort(),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let mode = 'success',
      calls = 0,
      release,
      started;
    await page.route('**/api/admin/permanent-deletion', async (route) => {
      const body = route.request().postDataJSON();
      if (body.mode === 'retry') {
        await route.fulfill({ json: { deleted: true, id: body.id } });
        return;
      }
      if (body.mode === 'preview') {
        await route.fulfill({
          json: {
            entity: body.entity,
            id: body.id,
            name: 'TEST élément',
            fingerprint: 'a'.repeat(64),
            eligible: true,
            reasons: [],
            owned: [],
            details: {},
            expanded: true,
            notices: ['services', 'categories'].includes(body.entity)
              ? [
                  'Les rendez-vous répertoriés sont supprimés en entier, même s’ils contiennent d’autres prestations.',
                ]
              : [],
            deletionEnabled: mode !== 'disabled',
            requiresDependenciesConfirmation: true,
            affected: [
              {
                table: 'appointments',
                count: 1,
                rows: [{ id: body.id, label: 'TEST-RDV' }],
              },
            ],
            preserved: ['Les clés de requête restent réservées.'],
          },
        });
        return;
      }
      calls++;
      assert.equal(body.confirmation, 'SUPPRIMER');
      assert.equal(body.dependentsConfirmed, true);
      if (mode === 'error') {
        await route.fulfill({
          status: 409,
          json: {
            error: 'Un élément associé a changé. Actualisez la vérification.',
          },
        });
        return;
      }
      if (mode === 'pending') {
        await route.fulfill({
          json: {
            deleted: false,
            pending: true,
            id: body.id,
            message: 'La suppression du compte de connexion reste à terminer.',
          },
        });
        return;
      }
      await new Promise((resolve) => {
        release = resolve;
        started?.();
      });
      await route.fulfill({ json: { deleted: true, id: body.id } });
    });
    const visit = async (kind, scenario = 'confirmed') => {
      await page.goto(`http://127.0.0.1:3142/?kind=${kind}&case=${scenario}`);
      await page
        .getByRole('button', { name: 'Supprimer', exact: true })
        .waitFor();
    };
    const open = async () => {
      await page
        .getByRole('button', { name: 'Supprimer', exact: true })
        .click();
      const dialog = page.getByRole('dialog', {
        name: 'Suppression définitive',
      });
      await dialog
        .getByText('Les clés de requête restent réservées.')
        .waitFor();
      return dialog;
    };
    const confirm = async (dialog) => {
      await dialog.getByRole('textbox').fill('SUPPRIMER');
      await dialog.getByRole('checkbox').check();
    };
    for (const status of [
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled_by_salon',
    ]) {
      await visit('appointments', status);
      const dialog = await open();
      await dialog
        .getByText(
          'Êtes-vous sûr de vouloir supprimer définitivement cet élément ? Cette action est irréversible.',
        )
        .waitFor();
      const button = dialog.getByRole('button', {
        name: 'Supprimer définitivement',
      });
      await dialog.getByRole('textbox').fill('SUPPRIMER');
      assert.equal(await button.isDisabled(), true);
      await dialog.getByRole('checkbox').check();
      assert.equal(await button.isEnabled(), true);
      await page.keyboard.press('Escape');
      passed++;
    }
    mode = 'disabled';
    await visit('appointments');
    let dialog = await open();
    await dialog.getByText(/suppression définitive est désactivée/).waitFor();
    assert.equal(
      await dialog
        .getByRole('button', { name: 'Supprimer définitivement' })
        .count(),
      0,
    );
    await page.keyboard.press('Escape');
    passed++;
    mode = 'error';
    await visit('appointments');
    dialog = await open();
    await confirm(dialog);
    await dialog
      .getByRole('button', { name: 'Supprimer définitivement' })
      .click();
    await dialog
      .getByText('Un élément associé a changé. Actualisez la vérification.')
      .waitFor();
    assert.equal(await page.evaluate(() => window.fixtureRefreshes || 0), 0);
    await page.keyboard.press('Escape');
    passed++;
    mode = 'success';
    for (const kind of [
      'services',
      'categories',
      'promotions',
      'appointments',
      'clients',
    ]) {
      await visit(kind);
      dialog = await open();
      if (['services', 'categories'].includes(kind))
        await dialog.getByText(/supprimés en entier/).waitFor();
      await confirm(dialog);
      const before = calls;
      if (kind === 'appointments')
        await page.screenshot({
          path: path.join(fixture, `confirmation-${width}.png`),
        });
      const queued = new Promise((resolve) => {
        started = resolve;
      });
      await dialog
        .getByRole('button', { name: 'Supprimer définitivement' })
        .click();
      await page.getByRole('button', { name: 'Traitement…' }).waitFor();
      await queued;
      assert.equal(await page.evaluate(() => window.fixtureRefreshes || 0), 0);
      release();
      await page.waitForFunction(() => window.fixtureRefreshes === 1);
      assert.equal(calls, before + 1);
      assert.equal(
        await page
          .getByRole('button', { name: 'Supprimer', exact: true })
          .count(),
        0,
      );
      passed++;
    }
    mode = 'pending';
    await visit('clients', 'pending-auth');
    dialog = await open();
    await confirm(dialog);
    await dialog
      .getByRole('button', { name: 'Supprimer définitivement' })
      .click();
    await dialog
      .getByText('La suppression du compte de connexion reste à terminer.')
      .waitFor();
    assert.equal(await page.getByText('TEST succès confirmé').count(), 0);
    passed++;
    await page.goto('http://127.0.0.1:3142/?kind=clients&case=retry');
    await page
      .getByRole('button', { name: 'Terminer la suppression', exact: true })
      .click();
    await page.getByText('Le compte a été supprimé définitivement.').waitFor();
    passed++;
    assert.deepEqual(errors, []);
    await page.screenshot({ path: path.join(fixture, `result-${width}.png`) });
    await context.close();
  }
  console.log(
    `${passed} expanded deletion UI checks passed on desktop/mobile. All API calls used isolated fixtures.`,
  );
} finally {
  await browser?.close();
  await server.close();
}
