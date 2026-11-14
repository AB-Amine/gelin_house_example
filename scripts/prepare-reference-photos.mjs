// Optimize original reference-inspired images. Input: JSON array of {id,path,prompt,alt}.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const inputs = JSON.parse(
  (await readFile(process.argv[2], 'utf8')).replace(/^\uFEFF/, ''),
);
const credits = JSON.parse(
  await readFile('public/images/premium/credits.json', 'utf8'),
);
for (const { id, path, prompt, alt } of inputs) {
  if (!/^[a-z-]+$/.test(id)) throw Error('Invalid asset ID');
  const buffer = await readFile(path);
  const metadata = await sharp(buffer).metadata();
  const variants = [];
  for (const width of [320, 720, 1400]) {
    const dest = `public/images/premium/${id}-${width}.webp`;
    const image = await sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    await writeFile(dest, image);
    variants.push({
      width,
      path: dest.replace('public', ''),
      bytes: image.length,
    });
  }
  const entry = {
    id,
    author: 'OpenAI Imagegen',
    source: 'Original AI-generated editorial illustration',
    generated: true,
    illustrative: true,
    prompt,
    alt,
    verified: '2026-11-13',
    sha256: createHash('sha256').update(buffer).digest('hex'),
    width: metadata.width,
    height: metadata.height,
    variants,
  };
  const index = credits.findIndex((p) => p.id === id);
  if (index < 0) credits.push(entry);
  else credits[index] = entry;
  console.log(`Prepared ${id}`);
}
await writeFile(
  'public/images/premium/credits.json',
  JSON.stringify(credits, null, 2) + '\n',
);
