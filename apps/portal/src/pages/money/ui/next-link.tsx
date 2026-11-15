import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { PeriodValue } from "#/entities/money";

const MORE = "続き";

export const NextLink = ({
  cursor,
  period,
}: Readonly<{ cursor: string; period: PeriodValue }>): ReactNode => {
  const search = useMemo(() => ({ from: period.from, to: period.to, cursor }), [period, cursor]);
  return (
    <Link className="stage-link" search={search} to="/money">
      {MORE}
    </Link>
  );
};
