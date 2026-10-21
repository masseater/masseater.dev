import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { nameTransition } from "./name-transition.ts";
import { portfolio } from "./portfolio.ts";

const PortfolioSocialLinks = (): ReactNode => (
  <ul className="flex justify-end sm:gap-x-4">
    {pipe(
      portfolio.links,
      Arr.map(({ label, href }) => (
        <li key={href}>
          <a
            className="stage-link px-2 py-3"
            data-vt={`social-${label.toLowerCase()}`}
            ref={nameTransition}
            href={href}
          >
            {label}
          </a>
        </li>
      )),
    )}
  </ul>
);

export { PortfolioSocialLinks };
