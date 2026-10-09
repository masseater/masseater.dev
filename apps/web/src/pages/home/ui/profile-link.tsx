import type { ReactNode } from "react";

const ProfileLink = ({ label, href }: Readonly<{ label: string; href: string }>): ReactNode => (
  <li>
    <a
      className="text-foreground/80 hover:text-foreground focus-visible:text-foreground font-display inline-block px-2 py-3 text-sm tracking-widest uppercase underline-offset-8 transition-colors hover:underline focus-visible:underline"
      href={href}
    >
      {label}
    </a>
  </li>
);

export { ProfileLink };
