import { Option } from "effect";
import type { ReactNode } from "react";

import type { PeriodValue } from "#/entities/money";

import { NextLink } from "./next-link";

export const NextSlot = ({
  next,
  period,
}: Readonly<{ next: Option.Option<string>; period: PeriodValue }>): ReactNode =>
  Option.match(next, {
    onNone: () => false,
    onSome: (cursor) => <NextLink cursor={cursor} period={period} />,
  });
