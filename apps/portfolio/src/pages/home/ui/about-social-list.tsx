import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { site } from "#/shared/config";

const AboutSocialList = (): ReactNode => (
  <ul className="flex flex-wrap gap-x-6 gap-y-2">
    {pipe(
      site.links,
      Arr.map(({ label, href }) => (
        <li key={href}>
          <a className="hover:underline" href={href}>
            {label}
          </a>
        </li>
      )),
    )}
  </ul>
);

export { AboutSocialList };
