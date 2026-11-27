import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

import type { Segment } from "#/entities/script/index.ts";
import { NOTHING } from "#/shared/config/index.ts";

import { CodeBox } from "./code-box.tsx";
import { SceneFrame } from "./scene-frame.tsx";
import type { SceneProps } from "./scene-props.ts";
import { SectionLabel } from "./section-label.tsx";

const FIRST_ROW_AT = 8;
const TYPING_SHARE = 0.6;
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const CodeScene = ({
  timed,
  number,
  heading,
  code,
}: Readonly<SceneProps & { heading: readonly Segment[]; code: readonly string[] }>): ReactNode => {
  const frame = useCurrentFrame();
  const shown = Math.ceil(
    interpolate(
      frame,
      [FIRST_ROW_AT, timed.duration * TYPING_SHARE],
      [NOTHING, code.length],
      CLAMP,
    ),
  );
  return (
    <SceneFrame caption timed={timed} whip>
      <SectionLabel heading={heading} number={number} />
      <CodeBox code={code} frame={frame} shown={shown} />
    </SceneFrame>
  );
};
