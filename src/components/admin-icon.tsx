import type { SVGProps } from 'react';
export function AdminIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: string }) {
  const paths: Record<string, string> = {
    overview: 'M3 10 12 2l9 8M5 9v12h5v-7h4v7h5V9',
    bookings: 'M4 5h16v16H4ZM7 2v6m10-6v6M4 10h16',
    clients:
      'M15 21v-3c0-5-12-5-12 0v3M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-7a4 4 0 0 1 0 7m0 3c4 0 5 2 5 5v2',
    services:
      'M12 21C4 20 2 15 2 10c5 0 8 3 10 11Zm0 0c8-1 10-6 10-11-5 0-8 3-10 11Zm0 0C4 13 8 5 12 2c4 3 8 11 0 19Z',
    promotions: 'M3 3h9l10 10-9 9L3 12ZM8 7h.01',
    settings:
      'M3 10h18L19 3H5ZM4 10v11h16V10M9 21v-7h6v7M3 10c0 4 5 4 5 0 0 4 8 4 8 0 0 4 5 4 5 0',
    user: 'M4 21v-3c0-6 16-6 16 0v3ZM12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v6l4 3',
    photos: 'M3 3h18v18H3Zm0 14 6-6 5 5 3-3 4 4M16 7h.01',
    web: 'M2 3h20v14H2Zm10 14v5m-5 0h10',
    check: 'm4 12 5 5L21 5',
    phone: 'M6 2 2 6c1 8 8 15 16 16l4-4-6-4-3 3c-3-1-5-3-6-6l3-3Z',
    edit: 'm3 17 1 4 4-1L21 7l-4-4ZM15 5l4 4',
    external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
    hourglass:
      'M5 2h14M5 22h14M6 2c0 6 0 6 6 10-6 4-6 4-6 10m12-20c0 6 0 6-6 10 6 4 6 4 6 10',
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] ?? paths.services} />
    </svg>
  );
}
