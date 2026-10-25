import type { ReactNode } from "react";

import { BrandIcon } from "./brand-icon";

const ShareLink = ({
  label,
  href,
  iconPath,
}: Readonly<{ label: string; href: string; iconPath: string }>): ReactNode => (
  <li>
    <a
      aria-label={label}
      className="glass-surface hover:bg-background/60 hover:text-foreground focus-visible:text-foreground flex size-9 items-center justify-center rounded-full transition-colors"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={label}
    >
      <BrandIcon path={iconPath} />
    </a>
  </li>
);

export { ShareLink };
