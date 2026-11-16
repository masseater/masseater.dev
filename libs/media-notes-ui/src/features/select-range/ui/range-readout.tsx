import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import type { ReactNode } from "react";

import { rangeAtom } from "#src/features/select-range/model/range.ts";
import { preciseClock } from "#src/shared/lib/clock.ts";

const DIGITS = 1;
const EMPTY = "–";

export const RangeReadout = (): ReactNode =>
  Option.match(useAtomValue(rangeAtom), {
    onNone: () => <p className="text-muted-foreground font-mono text-sm tabular-nums">{EMPTY}</p>,
    onSome: ({ from, to }) => (
      <p className="flex items-baseline justify-between font-mono text-sm tabular-nums">
        <span>{`${preciseClock(from)}–${preciseClock(to)}`}</span>
        <span className="text-muted-foreground text-xs">{`${(to - from).toFixed(DIGITS)} 秒`}</span>
      </p>
    ),
  });
