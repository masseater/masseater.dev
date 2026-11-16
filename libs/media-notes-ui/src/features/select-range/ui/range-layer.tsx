import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import type { ReactNode } from "react";

import { rangeAtom } from "#/features/select-range/model/range.ts";

import { HEAD, WHOLE_LANE } from "./lanes.ts";
import { SpanRect } from "./span-rect.tsx";

export const RangeLayer = ({ duration }: Readonly<{ duration: number }>): ReactNode =>
  Option.match(useAtomValue(rangeAtom), {
    onNone: () => false,
    onSome: ({ from, to }) => (
      <SpanRect
        from={from}
        to={Math.max(to, from + HEAD)}
        duration={duration}
        lane={WHOLE_LANE}
        className="fill-primary/15 stroke-primary"
      />
    ),
  });
