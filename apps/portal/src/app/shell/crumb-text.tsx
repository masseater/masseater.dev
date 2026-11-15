import { Link } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import type { Crumb } from "./crumbs";

export const CrumbText = ({ crumb, last }: Readonly<{ crumb: Crumb; last: boolean }>): ReactNode =>
  Option.match(crumb.to, {
    onNone: () => (
      <span
        aria-current={last && "page"}
        className="text-muted-foreground aria-[current=page]:text-foreground truncate aria-[current=page]:font-bold"
      >
        {crumb.label}
      </span>
    ),
    onSome: (to) => (
      <Link className="text-muted-foreground hover:text-foreground truncate" to={to}>
        {crumb.label}
      </Link>
    ),
  });
