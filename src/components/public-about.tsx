'use client';
import { useLocalCatalog } from '@/lib/demo-store';
import type { Catalog } from '@/lib/domain';
import { Placeholder } from '@/components/site-shell';
export function AboutExperience({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const catalog = useLocalCatalog(initialCatalog);
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">LA MAISON</span>
        <h1>
          L’esprit
          <br />
          <em>GELIN HOUSE.</em>
        </h1>
      </header>
      <div className="split-section">
        <Placeholder />
        <div>
          <h2>Une beauté à votre image.</h2>
          <p className="prose">
            {catalog.settings?.about ||
              'L’histoire et la présentation du salon seront publiées après validation par la propriétaire.'}
          </p>
        </div>
      </div>
      {catalog.content.map((c) => (
        <section className="container" key={c.key}>
          <h2>{c.title}</h2>
          <p className="prose">{c.body}</p>
        </section>
      ))}
    </div>
  );
}
