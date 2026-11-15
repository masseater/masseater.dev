import { Array as Arr, Record as Rec } from "effect";
import type { ReactNode } from "react";

import { portfolio } from "#/shared/lib/portfolio.ts";

import { PortfolioSectionLink } from "./portfolio-section-link.tsx";

export const PortfolioSectionLinks = (): ReactNode => (
  <nav aria-label={portfolio.name}>
    <ul className="flex flex-wrap justify-center gap-x-4">
      {Arr.map(Rec.toEntries(portfolio.sections), ([category, title]) => (
        <PortfolioSectionLink category={category} key={category} title={title} />
      ))}
    </ul>
  </nav>
);
