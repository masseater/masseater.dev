import type { ReactNode } from "react";

import { deckUrl, pdfUrl } from "#/entities/slide/index.ts";

const PDF = "PDF";

export const DeckTitle = ({
  file,
  title,
}: Readonly<{ file: string; title: string }>): ReactNode => (
  <div className="flex items-baseline justify-between gap-4">
    <a className="hover:text-muted-foreground text-std-17B-170 min-w-0" href={deckUrl(file)}>
      {title}
    </a>
    <a className="text-link shrink-0 text-xs underline underline-offset-3" href={pdfUrl(file)}>
      {PDF}
    </a>
  </div>
);
