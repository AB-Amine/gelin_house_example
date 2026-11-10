import Link from 'next/link';
import Image from 'next/image';
import { getCatalog } from '@/lib/catalog';
import { Placeholder, Empty } from '@/components/site-shell';
import { ServiceCard } from '@/components/catalog';
export const metadata = { alternates: { canonical: '/' } };
export default async function Home() {
  const { catalog } = await getCatalog();
  const settings = catalog.settings;
  const selected = catalog.services.filter((s) => s.featured).slice(0, 3);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">GELIN HOUSE · MAISON DE BEAUTÉ</span>
          <h1>
            {settings?.hero_title ?? (
              <>
                Un moment
                <br />
                rien que
                <br />
                pour <em>vous.</em>
              </>
            )}
          </h1>
          <p>
            {settings?.hero_subtitle ??
              'Une parenthèse de douceur. Une attention à chaque détail. Bienvenue dans l’univers GELIN HOUSE.'}
          </p>
          <Link className="button" href="/services">
            Découvrir les prestations <span aria-hidden>↗</span>
          </Link>
          <span className="hero-footnote">
            VOTRE SÉLECTION, VOTRE MOMENT, EN TOUTE SIMPLICITÉ.
          </span>
        </div>
        {settings?.hero_image_path ? (
          <Image
            className="hero-image"
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/salon-images/${settings.hero_image_path}`}
            alt="La maison GELIN HOUSE"
            width={900}
            height={1100}
            priority
            unoptimized
          />
        ) : (
          <Placeholder large />
        )}
      </section>
      <div className="intro-strip">
        <span>La beauté dans les détails</span>
        <span>Une expérience à votre rythme</span>
        <span>GELIN HOUSE</span>
      </div>
      <section className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LA CARTE</span>
            <h2>
              À chaque envie,
              <br />
              <em>son attention.</em>
            </h2>
          </div>
          <Link className="text-link" href="/services">
            Toutes les prestations ↗
          </Link>
        </div>
        {catalog.categories.length > 0 && (
          <div className="category-grid">
            {catalog.categories.map((c) => (
              <Link
                key={c.id}
                href={`/services?categorie=${c.id}`}
                className="category-card"
              >
                {c.image_path && (
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/salon-images/${c.image_path}`}
                    alt={c.name}
                    width={400}
                    height={300}
                    unoptimized
                  />
                )}
                <h3>{c.name} ↗</h3>
                <p>{c.description}</p>
              </Link>
            ))}
          </div>
        )}
        {selected.length ? (
          <div className="service-grid">
            {selected.map((s) => (
              <ServiceCard key={s.id} service={s} catalog={catalog} />
            ))}
          </div>
        ) : (
          <Empty title="Notre carte se prépare">
            Les prestations, leurs durées et leurs tarifs seront publiés ici
            après validation par le salon.
          </Empty>
        )}
      </section>
      <section className="muted-section">
        <div className="container split-section">
          <Placeholder label="L’univers du salon — photographies à venir" />
          <div className="split-copy">
            <span className="eyebrow">L’ESPRIT DE LA MAISON</span>
            <h2>
              La beauté.
              <br />
              Tout simplement.
            </h2>
            <p>
              {settings?.about ??
                'La présentation de la maison sera bientôt disponible. Retrouvez ici son histoire, son univers et les attentions qui font sa singularité.'}
            </p>
            <Link className="text-link" href="/a-propos">
              Découvrir la maison ↗
            </Link>
          </div>
        </div>
      </section>
      {catalog.promotions.length > 0 && (
        <section className="container">
          <span className="eyebrow">LES ATTENTIONS DU MOMENT</span>
          <h2>Une occasion de se faire plaisir.</h2>
          <p>Découvrez les offres en cours et leurs conditions.</p>
          <Link href="/offres" className="button secondary">
            Voir les offres ↗
          </Link>
        </section>
      )}
      <section className="container">
        <div className="section-heading">
          <div>
            <span className="eyebrow">VOTRE RENDEZ-VOUS</span>
            <h2>
              Un moment choisi.
              <br />
              En toute simplicité.
            </h2>
          </div>
          <p>
            Plusieurs envies, une seule demande. Le salon vous confirme ensuite
            votre rendez-vous.
          </p>
        </div>
        <div className="steps">
          {[
            [
              '01',
              'Composez votre moment',
              'Explorez la carte et ajoutez vos prestations à votre sélection.',
            ],
            [
              '02',
              'Choisissez votre créneau',
              'Retrouvez les horaires disponibles pour l’ensemble de vos prestations.',
            ],
            [
              '03',
              'Recevez la confirmation',
              'Envoyez votre demande et conservez votre lien privé pour la suivre.',
            ],
          ].map(([n, title, body]) => (
            <div key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="muted-section">
        <div className="container section-heading">
          <div>
            <span className="eyebrow">ON SE RETROUVE ?</span>
            <h2>
              Votre prochaine
              <br />
              <em>parenthèse beauté.</em>
            </h2>
          </div>
          <Link href="/contact" className="button">
            Contacter la maison <span aria-hidden>↗</span>
          </Link>
        </div>
      </section>
      {settings && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BeautySalon',
              name: settings.name,
              telephone: settings.phone || undefined,
              address: settings.address || undefined,
              url: process.env.APP_URL,
              sameAs: settings.instagram ? [settings.instagram] : undefined,
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </>
  );
}
