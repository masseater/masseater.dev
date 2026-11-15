import type { ReactNode } from "react";

import { deckUrl, pdfUrl } from "#/entities/slides";

const PDF = "PDF";

const DeckTitle = ({ file, title }: Readonly<{ file: string; title: string }>): ReactNode => (
  <div className="flex items-baseline justify-between gap-4">
    <a
      className="font-display hover:text-foreground/70 min-w-0 text-lg font-light transition-colors"
      href={deckUrl(file)}
    >
      {title}
    </a>
    <a className="stage-link shrink-0 text-xs" href={pdfUrl(file)}>
      {PDF}
    </a>
  </div>
);

export { DeckTitle };
