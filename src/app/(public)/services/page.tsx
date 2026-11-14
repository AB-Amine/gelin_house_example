import { getCatalog } from '@/lib/catalog';
import { ServiceCatalog } from '@/components/catalog';
export const metadata = { title: 'Services · GELIN HOUSE' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string }>;
}) {
  const { catalog } = await getCatalog();
  return (
    <ServiceCatalog
      catalog={catalog}
      initialCategory={(await searchParams).categorie}
    />
  );
}
