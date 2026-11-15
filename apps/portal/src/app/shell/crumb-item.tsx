import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { CrumbText } from "./crumb-text";
import type { Crumb } from "./crumbs";

export const CrumbItem = ({
  crumb,
  first,
  last,
}: Readonly<{ crumb: Crumb; first: boolean; last: boolean }>): ReactNode => (
  <li className="flex min-w-0 items-center gap-1.5">
    {!first && <ChevronRight aria-hidden className="text-muted-foreground size-3.5 shrink-0" />}
    <CrumbText crumb={crumb} last={last} />
  </li>
);
