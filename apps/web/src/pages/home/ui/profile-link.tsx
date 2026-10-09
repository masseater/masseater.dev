import type { ReactNode } from "react";

const ProfileLink = ({ label, href }: Readonly<{ label: string; href: string }>): ReactNode => (
  <li>
    <a
      className="text-muted-foreground hover:text-foreground focus-visible:text-foreground transition-colors"
      href={href}
    >
      {label}
    </a>
  </li>
);

export { ProfileLink };
