import type { ReactNode } from "react";

const ShareLink = ({ label, href }: Readonly<{ label: string; href: string }>): ReactNode => (
  <li>
    <a
      className="hover:text-foreground focus-visible:text-foreground transition-colors"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  </li>
);

export { ShareLink };
