import type { ReactNode } from "react";

const ExternalLink = ({ href, text }: Readonly<{ href: string; text: string }>): ReactNode => (
  <a href={href} target="_blank" rel="noreferrer" className="underline">
    {text}
  </a>
);

export { ExternalLink };
