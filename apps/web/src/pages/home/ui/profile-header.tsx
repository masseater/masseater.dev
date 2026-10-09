import type { ReactNode } from "react";

import { ProfileLink } from "./profile-link";

const NAME = "masseater";

const links = [
  { label: "GitHub", href: "https://github.com/masseater" },
  { label: "X", href: "https://x.com/r_masseater" },
  { label: "Zenn", href: "https://zenn.dev/masseater" },
] as const;

const ProfileHeader = (): ReactNode => (
  <header className="flex flex-col gap-4">
    <h1 className="text-3xl font-bold tracking-tight">{NAME}</h1>
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {links.map(({ label, href }) => (
        <ProfileLink href={href} key={href} label={label} />
      ))}
    </ul>
  </header>
);

export { ProfileHeader };
