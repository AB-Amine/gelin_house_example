import type { Catalog } from './domain';
import type { Locale } from './i18n/dictionaries';

export const salonInspirationPath = '/images/premium/salon-interior-1400.webp';

// Presentation-only replacement: retain the uploaded original and its admin record.
const retiredTreatmentRoom = 'gallery/2bf17273-38f6-485b-a6e3-9dc5109f9dbd.webp';
const inspirationCopy = {
  fr: {
    title: 'Une ambiance rose et dorée — inspiration',
    alt: 'Intérieur de salon rose et ivoire, miroirs dorés — illustration générée par IA',
    description: 'Illustration d’ambiance générée par IA, distincte des locaux réels de GELIN HOUSE.',
  },
  en: {
    title: 'A blush and gold atmosphere — inspiration',
    alt: 'Blush and ivory salon interior with gold mirrors — AI-generated illustration',
    description: 'AI-generated interior inspiration, distinct from the actual GELIN HOUSE premises.',
  },
  ar: {
    title: 'أجواء وردية وذهبية — إلهام',
    alt: 'صالون وردي وعاجي بمرايا ذهبية — صورة مولدة بالذكاء الاصطناعي',
    description: 'صورة إلهامية مولدة بالذكاء الاصطناعي، وليست صورة للمقر الحقيقي لصالون GELIN HOUSE.',
  },
};

export function publicGallery(gallery: Catalog['gallery'], locale: Locale) {
  return gallery.map((photo) =>
    photo.path === retiredTreatmentRoom
      ? {
          ...photo,
          path: salonInspirationPath,
          ...inspirationCopy[locale],
          video_url: undefined,
        }
      : photo,
  );
}
