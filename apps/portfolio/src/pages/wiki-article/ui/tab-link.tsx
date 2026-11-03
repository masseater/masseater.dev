import type { ReactNode } from "react";

const TabLink = ({ href, label }: Readonly<{ href: string; label: string }>): ReactNode => (
  <a
    className="text-wiki-link px-2 py-1 hover:underline"
    href={href}
    rel="noreferrer"
    target="_blank"
  >
    {label}
  </a>
);

export { TabLink };
