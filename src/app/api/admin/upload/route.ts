import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { requireStaff } from '@/lib/auth';
import { privileged } from '@/lib/supabase';
import { failure, ok, sameOrigin, limitedBody } from '@/lib/http';
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireStaff(true);
    const bytes = await limitedBody(req, 6 * 1024 * 1024);
    const form = await new Response(new Uint8Array(bytes), {
      headers: { 'content-type': req.headers.get('content-type') ?? '' },
    }).formData();
    const file = form.get('file');
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    )
      throw Error('INVALID_INPUT');
    const raw = Buffer.from(await file.arrayBuffer());
    const image = sharp(raw, { limitInputPixels: 24000000 });
    const metadata = await image.metadata();
    if (
      !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
      !metadata.width ||
      !metadata.height
    )
      throw Error('INVALID_INPUT');
    const optimized = await image
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    const path = `gallery/${randomUUID()}.webp`;
    const { error } = await privileged()
      .storage.from('salon-images')
      .upload(path, optimized, { contentType: 'image/webp', upsert: false });
    if (error) throw error;
    return ok({ path });
  } catch (e) {
    return failure(e);
  }
}
