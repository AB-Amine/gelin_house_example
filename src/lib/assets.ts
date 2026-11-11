export function salonImage(path: string) {
  return (path.startsWith('/') && !path.startsWith('//')) ||
    /^data:image\/(png|jpeg|webp);base64,/.test(path)
    ? path
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/salon-images/${path}`;
}
