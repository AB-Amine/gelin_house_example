import { notFound } from 'next/navigation';
import { FatuPreview } from '@/components/fatu-preview';
import { businessToday } from '@/lib/dates';
import { calendarWindow } from '@/lib/calendar';
export const metadata = {
  title: 'Aperçu de développement | GELIN HOUSE',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; date?: string; view?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const p = await searchParams;
  const today = businessToday('Africa/Casablanca');
  const dayLabel = new Intl.DateTimeFormat('fr-MA', {
    dateStyle: 'full',
    timeZone: 'UTC',
  }).format(new Date(`${today}T12:00:00Z`));
  return (
    <FatuPreview
      section={p.section ?? 'overview'}
      view={p.view}
      today={today}
      dayLabel={dayLabel}
      period={calendarWindow(p.date ?? today, p.view, 'Africa/Casablanca')}
    />
  );
}
