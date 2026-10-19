import type { ReactNode } from "react";

const PortfolioSectionLink = ({
  category,
  title,
}: Readonly<{ category: string; title: string }>): ReactNode => (
  <li>
    <a className="stage-link px-2 py-3" href={`/${category}`}>
      <span className="vt-attr" data-vt={`category-${category}`}>
        {title}
      </span>
    </a>
  </li>
);

export { PortfolioSectionLink };
