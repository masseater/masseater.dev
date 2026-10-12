import type { ReactNode } from "react";

import { site } from "#/shared/config";

const ProfileLinks = (): ReactNode => (
  <ul className="flex flex-wrap gap-4 text-sm">
    {site.links.map(({ label, href }) => (
      <li key={href}>
        <a className="underline underline-offset-4" href={href}>
          {label}
        </a>
      </li>
    ))}
  </ul>
);

export { ProfileLinks };
