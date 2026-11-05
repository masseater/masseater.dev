import type { ReactNode } from "react";

const WikiLogo = ({ letter }: Readonly<{ letter: string }>): ReactNode => (
  <svg aria-hidden className="size-12 shrink-0" viewBox="0 0 64 64">
    <path
      className="fill-wiki-surface stroke-wiki-subtle"
      d="M32 5a25 25 0 0 1 25 25c0 9.3-5.1 17.4-12.6 21.7V57a3 3 0 0 1-6 0v-3.2a25.3 25.3 0 0 1-3.4.4V60a3 3 0 0 1-6 0v-6.4A25 25 0 0 1 32 5z"
      strokeWidth="2"
    />
    <path
      className="stroke-wiki-divider fill-none"
      d="M9 27h46M11 39h42M32 5c-7 7-10 15.5-10 25s3 18 10 24M32 5c7 7 10 15.5 10 25s-3 18-10 24"
      strokeWidth="1.5"
    />
    <text className="fill-wiki-text font-serif" fontSize="30" textAnchor="middle" x="32" y="40">
      {letter}
    </text>
  </svg>
);

export { WikiLogo };
