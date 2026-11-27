import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Line, Segment } from "#/entities/script/index.ts";
import { textOf } from "#/entities/script/index.ts";
import { NOT_FOUND, ONE } from "#/shared/config/index.ts";
import { keyed } from "#/widgets/scenes/model/keyed.ts";

import { PointCard } from "./point-card.tsx";
import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";
import { SectionLabel } from "./section-label.tsx";

export const PointsScene = ({
  timed,
  format,
  number,
  heading,
  items,
}: Readonly<SceneProps & { heading: readonly Segment[]; items: readonly Line[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const latest = pipe(
    timed.reveals,
    Arr.findLastIndex((at) => frame >= at),
    Option.getOrElse(() => NOT_FOUND),
  );
  return (
    <SceneFrame caption timed={timed} whip>
      <SectionLabel heading={heading} number={number} />
      <div className="horizontal:gap-4 mt-8 flex flex-1 flex-col justify-center gap-6">
        {pipe(
          keyed({ values: items, label: textOf, reveals: timed.reveals }),
          Arr.map(({ key, value, position, at }) => (
            <PointCard
              at={at}
              format={format}
              frame={frame}
              item={value}
              key={key}
              latest={position === latest}
              number={position + ONE}
            />
          )),
        )}
      </div>
    </SceneFrame>
  );
};
