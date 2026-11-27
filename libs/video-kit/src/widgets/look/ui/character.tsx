import { Option } from "effect";
import type { ReactNode } from "react";
import { Img, useCurrentFrame } from "remotion";

import type { Timeline } from "#/entities/cut/index.ts";
import type { CssVariables } from "#/shared/lib/css-variables.ts";
import { Box } from "#/shared/ui/box.tsx";
import { portraitOf } from "#/widgets/look/model/expression.ts";
import { hopOf } from "#/widgets/look/model/hop.ts";

const NO_POSES: Readonly<Record<string, string>> = {};
const NOBODY = "";

const liftOf = (y: number): CssVariables => ({ "--y": `${String(y)}px` });

export const Character = ({
  timeline,
  voices,
  poses = NO_POSES,
  className = "character-center",
}: Readonly<{
  timeline: Timeline;
  voices: readonly number[];
  poses?: Readonly<Record<string, string>>;
  className?: string;
}>): ReactNode => {
  const frame = useCurrentFrame();
  return Option.match(portraitOf({ timeline, voices, poses, frame }), {
    onNone: () => NOBODY,
    onSome: (src) => (
      <Box
        className={`motion pointer-events-none absolute ${className}`}
        vars={liftOf(hopOf({ cuts: timeline.cuts, voices, frame }))}
      >
        <Img className="size-full object-contain object-bottom" src={src} />
      </Box>
    ),
  });
};
