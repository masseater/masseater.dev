import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import type { TimedLine } from "#/entities/cut/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { zoomVars } from "#/shared/ui/vars.ts";
import { zoomOf } from "#/widgets/video/model/camera.ts";

import { Telop } from "./telop.tsx";

export const ShotFrame = ({
  lines,
  children,
}: Readonly<{ lines: readonly TimedLine[]; children: ReactNode }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div className="safe-area horizontal:safe-area-h">
        <Box
          className="stage flex min-h-0 flex-1 flex-col items-center justify-center gap-10"
          vars={zoomVars(zoomOf({ lines, frame }))}
        >
          {children}
        </Box>
        <Telop frame={frame} lines={lines} />
      </div>
    </AbsoluteFill>
  );
};
