import Link from 'next/link';
import { sessionDb } from '@/lib/supabase';
import { entities } from '@/lib/admin-config';
import { FatuEntityManager } from './fatu-entity-manager';

/** Reuse the existing protected editors inside the everyday salon tabs. */
export async function SalonContent({
  section,
  timezone,
}: {
  section: 'hours' | 'website';
  timezone: string;
}) {
  const db = await sessionDb();
  const panels =
    section === 'hours'
      ? [
          ['exceptions', 'Horaires exceptionnels'],
          ['closures', 'Congés et fermetures'],
        ]
      : [
          ['faqs', 'Questions fréquentes'],
          ['reviews', 'Avis clients'],
          ['content', 'Autres textes du site'],
        ];
  const results = await Promise.all(
    panels.map(async ([slug, title]) => {
      let query = db.from(entities[slug].table).select('*', { count: 'exact' });
      if (section === 'hours') query = query.is('resource_id', null);
      if (slug === 'faqs') query = query.like('key', 'faq.%');
      if (slug === 'content') query = query.not('key', 'like', 'faq.%');
      const { data, error, count } = await query
        .order(
          section === 'hours'
            ? slug === 'exceptions'
              ? 'day'
              : 'starts_at'
            : 'id',
        )
        .range(0, 49);
      return { slug, title, data, error, count };
    }),
  );
  return results.map(({ slug, title, data, error, count }) => (
    <section className="fatu-admin-section" key={slug} id={slug}>
      <h2>{title}</h2>
      {error ? (
        <p className="error">
          Impossible de charger cette rubrique. Réessayez.
        </p>
      ) : (
        <FatuEntityManager
          slug={slug}
          rows={data ?? []}
          refs={{}}
          timezone={timezone}
        />
      )}
      {(count ?? 0) > 50 && <Link href={`/admin/${slug}`}>Tout afficher</Link>}
    </section>
  ));
}
