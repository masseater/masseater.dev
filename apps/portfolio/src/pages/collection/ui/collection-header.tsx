import type { ReactNode } from "react";

import { ordinal } from "#/shared/lib";

const COUNT_LABEL = "Entries";

const CollectionHeader = ({
  title,
  count,
}: Readonly<{ title: string; count: number }>): ReactNode => (
  <header className="flex items-end justify-between gap-6">
    <h1 className="font-display text-5xl font-extralight tracking-tight sm:text-7xl">{title}</h1>
    <p className="font-display text-foreground/50 flex shrink-0 items-baseline gap-2 pb-1 text-xs tracking-widest uppercase sm:pb-2">
      <span className="text-foreground text-2xl font-light tabular-nums">{ordinal(count)}</span>
      {COUNT_LABEL}
    </p>
  </header>
);

export { CollectionHeader };
