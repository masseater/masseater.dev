import { Option, pipe } from "effect";
import type { ReactNode } from "react";

const metaText = (text: string): ReactNode => (
  <p className="text-muted-foreground text-xs break-all">{text}</p>
);

export const CardHeader = ({
  children,
  meta,
  title,
}: Readonly<{ children?: ReactNode; meta?: string | undefined; title: string }>): ReactNode => (
  <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
    <h2 className="text-std-18B-160 mr-auto">{title}</h2>
    {pipe(Option.fromUndefinedOr(meta), Option.map(metaText), Option.getOrNull)}
    {children}
  </header>
);
