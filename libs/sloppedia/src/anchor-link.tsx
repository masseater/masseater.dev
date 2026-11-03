import type { ReactNode } from "react";

import type { LinkProps } from "./config.ts";

const AnchorLink = ({ href, className, children }: LinkProps): ReactNode => (
  <a className={className} href={href}>
    {children}
  </a>
);

export { AnchorLink };
