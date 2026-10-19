import type { ReactNode } from "react";

import { portfolio } from "./portfolio.ts";

const PortfolioSocialLinks = (): ReactNode => (
  <ul className="flex justify-end sm:gap-x-4">
    {portfolio.links.map(({ label, href }) => (
      <li key={href}>
        <a
          className="stage-link vt-attr px-2 py-3"
          data-vt={`social-${label.toLowerCase()}`}
          href={href}
        >
          {label}
        </a>
      </li>
    ))}
  </ul>
);

export { PortfolioSocialLinks };
