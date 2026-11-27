import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { NOTHING } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { shake, whipLeft, whipVars } from "#/shared/ui/motion.ts";
import { merge, zoomVars } from "#/shared/ui/vars.ts";
import { hitsOf, zoomOf } from "#/widgets/scenes/model/camera.ts";

import { SceneBody } from "./scene-body.tsx";
import type { SceneProps } from "./scene-props.ts";

const leftOf = (whip: boolean, frame: number): number => {
  if (whip) {
    return whipLeft(frame);
  }
  return NOTHING;
};

export const SceneFrame = ({
  timed,
  children,
  caption,
  whip,
}: Readonly<
  Pick<SceneProps, "timed"> & { children: ReactNode; caption: boolean; whip: boolean }
>): ReactNode => {
  const frame = useCurrentFrame();
  const left = leftOf(whip, frame);
  return (
    <AbsoluteFill>
      <Box className="shake absolute inset-0" vars={shake({ frame, hits: hitsOf(timed) })}>
        <SceneBody
          caption={caption}
          lines={timed.lines}
          stage={merge([whipVars(left), zoomVars(zoomOf({ timed, frame }))])}
        >
          {children}
        </SceneBody>
      </Box>
    </AbsoluteFill>
  );
};
