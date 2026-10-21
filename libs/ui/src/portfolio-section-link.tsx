import type { ReactNode } from "react";

import { nameTransition } from "./name-transition.ts";
import { portfolio } from "./portfolio.ts";

const PortfolioSectionLink = ({
  category,
  title,
}: Readonly<{ category: string; title: string }>): ReactNode => (
  <li>
    <a className="stage-link px-2 py-3" href={`${portfolio.url}/${category}/`}>
      <span ref={nameTransition} data-vt={`category-${category}`}>
        {title}
      </span>
    </a>
  </li>
);

export { PortfolioSectionLink };
