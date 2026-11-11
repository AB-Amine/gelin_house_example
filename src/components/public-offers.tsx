'use client';
import { useLocalCatalog } from '@/lib/demo-store';
import type { Catalog } from '@/lib/domain';
import { Empty } from '@/components/site-shell';
import { AddService } from '@/components/basket';
import { currentPrice, money, priceLabel, dateLabel } from '@/lib/domain';
export function OffersExperience({
  initialCatalog,
}: {
  initialCatalog: Catalog;
}) {
  const catalog = useLocalCatalog(initialCatalog);
  return (
    <div className="container">
      <header className="page-heading">
        <span className="eyebrow">LES ATTENTIONS DU MOMENT</span>
        <h1>
          Un plaisir
          <br />
          <em>à saisir.</em>
        </h1>
        <p>
          Les offres en cours, leurs prestations et toutes leurs conditions.
        </p>
      </header>
      {catalog.promotions.length ? (
        catalog.promotions.map((p) => (
          <article className="offer-card" key={p.id}>
            <span className="eyebrow">JUSQU’AU {dateLabel(p.ends_at)}</span>
            <h2>{p.name}</h2>
            <p className="prose">{p.description}</p>
            <p className="small">{p.terms}</p>
            <div className="service-grid">
              {catalog.services
                .filter((s) =>
                  catalog.promotion_services.some(
                    (ps) => ps.service_id === s.id && ps.promotion_id === p.id,
                  ),
                )
                .map((s) => {
                  const price = currentPrice(s, catalog);
                  return (
                    <div key={s.id}>
                      <h3>{s.name}</h3>
                      <p>
                        {price.promotion ? (
                          <>
                            <del>{priceLabel(s)}</del> {money(price.amount!)}
                            {price.promotion.id !== p.id && (
                              <small>
                                {' '}
                                · Meilleure offre : {price.promotion.name}
                              </small>
                            )}
                          </>
                        ) : (
                          priceLabel(s)
                        )}
                      </p>
                      <AddService id={s.id} disabled={!s.bookable} />
                    </div>
                  );
                })}
            </div>
          </article>
        ))
      ) : (
        <Empty title="Pas d’offre en cours">
          Les prochaines attentions de la maison seront présentées ici.
        </Empty>
      )}
    </div>
  );
}
