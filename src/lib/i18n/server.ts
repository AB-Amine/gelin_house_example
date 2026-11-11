import 'server-only';
import { cookies } from 'next/headers';
import { validLocale, translate } from './dictionaries';
export async function getI18n() {
  const locale = validLocale((await cookies()).get('fatu-language')?.value);
  return {
    locale,
    dir: locale === 'ar' ? ('rtl' as const) : ('ltr' as const),
    t: (key: string, values?: Record<string, string | number>) =>
      translate(locale, key, values),
  };
}
