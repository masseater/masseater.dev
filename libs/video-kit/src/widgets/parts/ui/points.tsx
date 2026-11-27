import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Shot } from "#/entities/cut/index.ts";
import { NOT_FOUND, NOTHING, ONE } from "#/shared/config/index.ts";

import { Point } from "./point.tsx";

export const Points = ({
  shot,
  items,
  at,
}: Readonly<{ shot: Shot; items: readonly string[]; at: readonly number[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const { format } = shot;
  const latest = pipe(
    at,
    Arr.findLastIndex((start) => frame >= start),
    Option.getOrElse(() => NOT_FOUND),
  );
  return (
    <div className="horizontal:gap-4 flex flex-col gap-6">
      {pipe(
        items,
        Arr.map((item, position) => (
          <Point
            at={Option.getOrElse(Arr.get(at, position), () => NOTHING)}
            format={format}
            frame={frame}
            item={item}
            key={item}
            latest={position === latest}
            number={position + ONE}
          />
        )),
      )}
    </div>
  );
};
