import type { ReactNode } from "react";

import { CountBadge } from "./count-badge";

const SectionHeading = ({
  title,
  count,
}: Readonly<{ title: string; count?: number }>): ReactNode => (
  <h2 className="font-display flex items-center gap-3 text-xl">
    <span aria-hidden="true" className="bg-primary h-6 w-1.5 rounded-full" />
    {title}
    <CountBadge count={count} />
  </h2>
);

export { SectionHeading };
