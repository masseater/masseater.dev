import type { Option } from "effect";
import type { ReactNode } from "react";

import type { PeriodValue } from "#/entities/money";

import { FirstLink } from "./first-link";
import { NextSlot } from "./next-slot";

export const PageLinks = ({
  next,
  paged,
  period,
}: Readonly<{ next: Option.Option<string>; paged: boolean; period: PeriodValue }>): ReactNode => (
  <div className="flex justify-end gap-6">
    {paged && <FirstLink period={period} />}
    <NextSlot next={next} period={period} />
  </div>
);
