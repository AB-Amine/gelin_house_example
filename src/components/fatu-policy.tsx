'use client';
import type { Catalog } from '@/lib/domain';
import { useWebsiteCopy } from './website-copy';
import { FatuHeading } from './fatu-pages';
export function FatuPolicy({ initialCatalog }: { initialCatalog: Catalog }) {
  const { catalog, t } = useWebsiteCopy(initialCatalog);
  return (
    <div className="fatu-container">
      <FatuHeading title="footer.privacy" />
      <section className="fatu-section">
        <h2>{t('booking.title')}</h2>
        <p className="prose">
          {catalog.settings?.policy_text || t('common.setup')}
        </p>
        <p className="notice">{t('common.notConfirmed')}</p>
        {catalog.settings?.deposit_policy && (
          <>
            <h2>{t('field.deposit_policy')}</h2>
            <p className="prose">{catalog.settings.deposit_policy}</p>
          </>
        )}
        <h2>{t('footer.privacy')}</h2>
        <p className="prose">
          {catalog.settings?.privacy_text || t('common.setup')}
        </p>
      </section>
    </div>
  );
}
