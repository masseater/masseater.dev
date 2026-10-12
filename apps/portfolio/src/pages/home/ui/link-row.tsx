import type { ReactNode } from "react";

import { ProfileLink } from "./profile-link";

const LinkRow = ({
  links,
}: Readonly<{ links: readonly Readonly<{ label: string; href: string }>[] }>): ReactNode => (
  <ul className="flex flex-wrap justify-center gap-x-4">
    {links.map(({ label, href }) => (
      <ProfileLink href={href} key={href} label={label} />
    ))}
  </ul>
);

export { LinkRow };
