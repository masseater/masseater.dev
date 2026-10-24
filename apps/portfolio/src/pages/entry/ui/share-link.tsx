import type { ReactNode } from "react";

const ShareLink = ({ label, href }: Readonly<{ label: string; href: string }>): ReactNode => (
  <li>
    <a
      className="glass-surface hover:bg-background/60 hover:text-foreground focus-visible:text-foreground inline-block rounded-full px-4 py-2 transition-colors"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  </li>
);

export { ShareLink };
