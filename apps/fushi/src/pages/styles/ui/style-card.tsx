import type { ReactNode } from "react";

import type { Style } from "#/entities/library/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";

export const StyleCard = ({ current: style }: Readonly<{ current: Style }>): ReactNode => (
  <a
    href={hrefOf({ page: "overview", style: style.id })}
    className="hover:border-foreground flex min-h-28 items-end rounded-md border p-3 text-base font-semibold"
  >
    {style.name}
  </a>
);
