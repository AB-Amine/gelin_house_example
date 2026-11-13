import 'server-only';
import { translate } from './i18n/dictionaries';
export async function getI18n() {
  return {
    locale: 'fr' as const,
    dir: 'ltr' as const,
    t: (key: string, values?: Record<string, string | number>) =>
      translate('fr', key, values),
  };
}
