import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const inputs = [
  {
    id: 'makeup-session',
    path: process.argv[2],
    author: 'OpenAI Imagegen',
    source: 'Original AI-generated editorial illustration',
    generated: true,
    alt: 'Mise en beauté dans une ambiance rose et dorée — illustration générée par IA',
  },
  {
    id: 'makeup-artistry',
    path: 'public/images/premium/makeup-session-source.jpg',
    author: 'ishola S.Oladimeji',
    source:
      'https://www.pexels.com/photo/makeup-artist-doing-makeup-of-a-woman-11041338/',
    license: 'https://www.pexels.com/license/',
    alt: 'Maquillage professionnel au pinceau — photographie d’inspiration',
  },
];
const credits = JSON.parse(
  await readFile('public/images/premium/credits.json', 'utf8'),
);
for (const { path, ...asset } of inputs) {
  const buffer = await readFile(path);
  const meta = await sharp(buffer).metadata();
  const variants = [];
  for (const width of [320, 720, 1400]) {
    const dest = `public/images/premium/${asset.id}-${width}.webp`;
    const bytes = await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 83 })
      .toBuffer();
    await writeFile(dest, bytes);
    variants.push({
      width,
      path: dest.replace('public', ''),
      bytes: bytes.length,
    });
  }
  const entry = {
    ...asset,
    verified: '2026-11-13',
    sha256: createHash('sha256').update(buffer).digest('hex'),
    width: meta.width,
    height: meta.height,
    illustrative: true,
    variants,
  };
  const index = credits.findIndex((p) => p.id === asset.id);
  if (index < 0) credits.push(entry);
  else credits[index] = entry;
}
await writeFile(
  'public/images/premium/credits.json',
  JSON.stringify(credits, null, 2) + '\n',
);
