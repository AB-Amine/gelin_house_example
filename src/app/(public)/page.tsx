import { getCatalog } from '@/lib/catalog';
import { HomeExperience } from '@/components/public-home';
export const metadata = { alternates: { canonical: '/' } };
export default async function Page() {
  const { catalog } = await getCatalog();
  const s = catalog.settings;
  return (
    <>
      <HomeExperience initialCatalog={catalog} />
      {s && !catalog.demo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BeautySalon',
              name: s.name,
              telephone: s.phone || undefined,
              address: s.address || undefined,
              url: process.env.APP_URL,
              sameAs: s.instagram ? [s.instagram] : undefined,
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </>
  );
}
