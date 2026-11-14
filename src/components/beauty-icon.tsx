import type { SVGProps } from 'react';
export function BeautyIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & {
  name:
    | 'heart'
    | 'lotus'
    | 'calendar'
    | 'check'
    | 'scissors'
    | 'hanger'
    | 'sparkle';
}) {
  const paths = {
    heart: (
      <path d="M12 21S2 14 2 7.5C2 2 9 1 12 7c3-6 10-5 10 .5C22 14 12 21 12 21Z" />
    ),
    lotus: (
      <>
        <path d="M12 21C3 21 1 13 1 10c5 0 9 3 11 11Zm0 0c9 0 11-8 11-11-5 0-9 3-11 11Z" />
        <path d="M7 12C6 6 12 1 12 1s6 5 5 11M12 21c-5-5-5-10 0-16 5 6 5 11 0 16Z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="17" rx="3" />
        <path d="M7 2v6M17 2v6M3 11h18M7 15h1m3 0h1m3 0h1M7 18h1m3 0h1" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m7 12 3 3 7-7" />
      </>
    ),
    scissors: (
      <>
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="m8 8 13 13M8 16 21 3M13 11l-3 3" />
      </>
    ),
    hanger: (
      <path d="M9 5a3 3 0 1 1 5 2c-1 .7-2 1.2-2 3L2 18c-1 .8-.4 2 1 2h18c1.4 0 2-1.2 1-2l-10-8" />
    ),
    sparkle: (
      <>
        <path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z" />
        <path d="M21 2v4m-2-2h4" />
      </>
    ),
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
      {paths[name]}
    </svg>
  );
}
