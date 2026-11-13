// Owner-requested import of selected publicly accessible photos, not an Instagram scraper.
// First inspect selected previews and prepare .tools/instagram-preview/index.json.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
if (
  process.env.IMPORT_APPROVED_INSTAGRAM !== '1' ||
  !process.env.TEST_ADMIN_EMAIL ||
  !process.env.TEST_ADMIN_PASSWORD
)
  throw Error('Explicit owner import authorization and login required.');
const selected = [
  [
    'gelin_house-1',
    'Salon',
    'Un aperçu de notre espace de soin',
    'Espace de soin du salon GELIN HOUSE',
  ],
  [
    'gelin_house-6',
    'Coiffure',
    'Reflets & douceur',
    'Chevelure blonde vue de dos, publiée par GELIN HOUSE',
  ],
  [
    'gelin_house-7',
    'Coiffure',
    'Lissage & brillance',
    'Chevelure lissée vue de dos, publiée par GELIN HOUSE',
  ],
  [
    'gelin_house-11',
    'Onglerie',
    'La délicatesse du rose',
    'Manucure rose avec détails dorés, publiée par GELIN HOUSE',
  ],
  [
    'gelin_house-12',
    'Onglerie',
    'Une touche de couleur',
    'Manucure rouge et rose, publiée par GELIN HOUSE',
  ],
  [
    'fatu_makeupartist-1',
    'Maquillage',
    'Éclat de mariée',
    'Maquillage de mariée en tenue ivoire, publié sur le compte makeup du salon',
  ],
  [
    'fatu_makeupartist-2',
    'Maquillage',
    'L’élégance en douceur',
    'Mise en beauté avec coiffure ondulée et couronne, publiée sur le compte makeup du salon',
  ],
  [
    'fatu_makeupartist-5',
    'Maquillage',
    'Regard & lumière',
    'Maquillage et tenue de cérémonie bleue, publiés sur le compte makeup du salon',
  ],
  [
    'fatu_makeupartist-8',
    'Maquillage',
    'Le détail d’un regard',
    'Mise en beauté de cérémonie, publiée sur le compte makeup du salon',
  ],
  [
    'fatu_makeupartist-11',
    'Maquillage',
    'Un instant précieux',
    'Maquillage de mariée aux tons doux, publié sur le compte makeup du salon',
  ],
];
const input = JSON.parse(
  await readFile('.tools/instagram-preview/index.json', 'utf8'),
);
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch();
const imported = [];
try {
  const page = await browser.newPage();
  await page.goto(base + '/admin/login');
  await page.locator('input[type=email]').fill(process.env.TEST_ADMIN_EMAIL);
  await page
    .locator('input[type=password]')
    .fill(process.env.TEST_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /connecter/i }).click();
  await page.waitForURL('**/admin');
  const { data: existing, error } = await db
    .from('gallery')
    .select('id,path,description,position');
  if (error) throw error;
  const last = Math.max(-1, ...existing.map((g) => g.position));
  for (const [index, [id, album, title, alt]] of selected.entries()) {
    const source = input.find((item) => item.id === id);
    if (!source?.downloaded) throw Error('Missing inspected source: ' + id);
    if (existing.some((g) => g.description?.includes(source.post))) {
      console.log('Already imported: ' + id);
      continue;
    }
    const buffer = await readFile(`.tools/instagram-preview/${id}.jpg`);
    const upload = await page.request.post(base + '/api/admin/upload', {
      headers: { origin: base },
      multipart: {
        file: { name: id + '.jpg', mimeType: 'image/jpeg', buffer },
      },
    });
    if (!upload.ok()) throw Error('Photo upload failed: ' + upload.status());
    const { path } = await upload.json();
    const saved = await page.request.post(base + '/api/admin/gallery', {
      headers: { origin: base },
      data: {
        path,
        album,
        title,
        alt,
        description: `Photo issue du compte @${source.handle}. Source : ${source.post}`,
        video_url: source.post.includes('/reel/') ? source.post : '',
        position: last + index + 1,
        published: true,
        consent_confirmed: true,
        temporary: false,
        featured: index === 0 || index === 3 || index === 5,
      },
    });
    if (!saved.ok()) {
      await db.storage.from('salon-images').remove([path]);
      throw Error('Gallery save failed: ' + (await saved.text()));
    }
    imported.push({
      id,
      source: source.post,
      account: source.handle,
      path,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      authorization:
        'Owner explicitly requested importing these account photos into the portfolio in this conversation.',
    });
    await writeFile(
      '.tools/instagram-import-results.json',
      JSON.stringify(imported, null, 2),
    );
    console.log('Imported: ' + id);
  }
  console.log(
    'Gallery import complete. Original photos were not upscaled; the existing upload API optimized them as WebP.',
  );
} finally {
  await browser.close();
}
