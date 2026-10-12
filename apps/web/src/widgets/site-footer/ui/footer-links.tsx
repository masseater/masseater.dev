import type { ReactNode } from "react";

import { site } from "#/shared/config";

const links = [...site.links, { label: "RSS", href: "/feed.xml" }] as const;

const FooterLinks = (): ReactNode => (
  <ul className="flex flex-wrap gap-4">
    {links.map(({ label, href }) => (
      <li key={href}>
        <a
          className="hover:text-foreground focus-visible:text-foreground transition-colors"
          href={href}
        >
          {label}
        </a>
      </li>
    ))}
  </ul>
);

export { FooterLinks };
