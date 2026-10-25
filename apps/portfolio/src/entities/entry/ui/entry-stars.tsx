import type { ReactNode } from "react";

const STAR = "☆";

const STAR_LABEL = "スター";

const EntryStars = ({ count }: Readonly<{ count: number }>): ReactNode => (
  <span className="text-foreground/70 font-display flex items-center gap-1 text-xs tabular-nums">
    <span aria-hidden>{STAR}</span>
    <span className="sr-only">{STAR_LABEL}</span>
    {count}
  </span>
);

export { EntryStars };
