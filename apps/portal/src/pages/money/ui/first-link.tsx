import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { PeriodValue } from "#/entities/money";

const FIRST = "最初から";

export const FirstLink = ({ period }: Readonly<{ period: PeriodValue }>): ReactNode => {
  const search = useMemo(() => ({ from: period.from, to: period.to }), [period]);
  return (
    <Link className="stage-link" search={search} to="/money">
      {FIRST}
    </Link>
  );
};
