import type { ReactNode } from "react";

import { Name } from "./name";
import { ProfileLink } from "./profile-link";

const links = [
  { label: "GitHub", href: "https://github.com/masseater" },
  { label: "X", href: "https://x.com/r_masseater" },
  { label: "Zenn", href: "https://zenn.dev/masseater" },
] as const;

const ProfileHeader = (): ReactNode => (
  <header className="flex flex-col items-center gap-8">
    <Name />
    <ul className="stage-links flex flex-wrap justify-center gap-x-4">
      {links.map(({ label, href }) => (
        <ProfileLink href={href} key={href} label={label} />
      ))}
    </ul>
  </header>
);

export { ProfileHeader };
