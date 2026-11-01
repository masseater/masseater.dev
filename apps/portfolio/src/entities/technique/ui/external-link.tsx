import type { ReactNode } from "react";

const ExternalLink = ({
  href,
  children,
}: Readonly<{ href: string; children: ReactNode }>): ReactNode => (
  <a
    className="decoration-foreground/30 hover:decoration-foreground underline underline-offset-4"
    href={href}
    rel="noreferrer"
    target="_blank"
  >
    {children}
  </a>
);

export { ExternalLink };
