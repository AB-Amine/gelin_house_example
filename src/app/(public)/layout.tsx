import { getCatalog } from '@/lib/catalog';
import { FatuPublicFrame } from '@/components/fatu-shell';
export const dynamic = 'force-dynamic';
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { catalog, unavailable } = await getCatalog();
  return (
    <FatuPublicFrame catalog={catalog} unavailable={unavailable}>
      {children}
    </FatuPublicFrame>
  );
}
