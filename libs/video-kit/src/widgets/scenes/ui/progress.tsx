import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { NOTHING, ONE } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { progressVars } from "#/shared/ui/vars.ts";

const CLAMP = { extrapolateRight: "clamp" } as const;

export const Progress = ({ total }: Readonly<{ total: number }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <Box
      className="progress border-ink bg-highlight absolute top-0 left-0 h-3 border-b-3"
      vars={progressVars(interpolate(frame, [NOTHING, total], [NOTHING, ONE], CLAMP))}
    />
  );
};
