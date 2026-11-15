import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { MoneySearchValue } from "#/entities/money";

export const MoneyLink = ({
  children,
  className,
  current = false,
  search,
}: Readonly<{
  children: ReactNode;
  className?: string;
  current?: boolean;
  search: MoneySearchValue;
}>): ReactNode => (
  <Link
    aria-current={current}
    className={className}
    resetScroll={false}
    search={search}
    to="/money"
  >
    {children}
  </Link>
);
