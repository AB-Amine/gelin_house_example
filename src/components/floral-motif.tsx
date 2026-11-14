import type { SVGProps } from 'react';

// Decorative line art, kept as SVG so it stays light and crisp at every size.
export function FloralMotif(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 260 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 232C40 165 105 95 245 14M42 180C40 132 61 83 101 50M105 109C158 116 196 97 226 62M148 67C154 35 181 13 217 5" />
        <path d="M54 151c-34-7-41-29-36-49 24 5 42 22 36 49Zm5-21c28-4 44-21 43-44-27 3-43 19-43 44Zm41-43c-24-6-32-27-29-46 21 6 35 23 29 46Zm45-18c-7-29 5-50 25-59 7 24-3 46-25 59Zm23 38c9-27 30-37 52-33-11 24-30 36-52 33Zm27-67c20 9 41 3 56-14-24-8-42-3-56 14Z" />
        <path
          d="m24 110 26 34m25-97 22 34m5 14-36 29m85-64 16-44m9 85 37-22m-9-44 39-7"
          opacity=".55"
        />
        {[
          { x: 52, y: 184, r: -18 },
          { x: 129, y: 105, r: 15 },
        ].map(({ x, y, r }) => (
          <g key={x} transform={`translate(${x} ${y}) rotate(${r})`}>
            <path
              fill="#f8dfe830"
              d="M0-9C-26-49-53-17-21 1c-44 4-30 45 4 22-9 43 34 45 29 10 30 31 53-5 18-22C73-7 43-38 14-17 18-56-20-50 0-9Z"
            />
            <path
              d="M0 3-17-21M0 3l-24 12M0 3l2 27M0 3l24 16M0 3l25-15"
              opacity=".65"
            />
            <circle cx="0" cy="3" r="5" stroke="var(--salon-gold, #b58a37)" />
            <path
              d="m-2 2-6-14M1 1 7-13M3 5l13-3"
              stroke="var(--salon-gold, #b58a37)"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
