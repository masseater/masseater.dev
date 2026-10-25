import type { ReactNode } from "react";

const BrandIcon = ({ path }: Readonly<{ path: string }>): ReactNode => (
  <svg aria-hidden className="size-4 fill-current" viewBox="0 0 24 24">
    <path d={path} />
  </svg>
);

export { BrandIcon };
