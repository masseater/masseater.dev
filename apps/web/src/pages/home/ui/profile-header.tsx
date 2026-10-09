import type { ReactNode } from "react";

import { ProfileLink } from "./profile-link";

const NAME = "masseater";

const links = [
  { label: "GitHub", href: "https://github.com/masseater" },
  { label: "X", href: "https://x.com/r_masseater" },
  { label: "Zenn", href: "https://zenn.dev/masseater" },
] as const;

const ProfileHeader = (): ReactNode => (
  <header className="flex flex-col items-center gap-6">
    <h1 className="text-5xl font-bold tracking-tight">{NAME}</h1>
    <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
      {links.map(({ label, href }) => (
        <ProfileLink href={href} key={href} label={label} />
      ))}
    </ul>
  </header>
);

export { ProfileHeader };
