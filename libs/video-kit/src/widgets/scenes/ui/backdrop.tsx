import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { Box } from "#/shared/ui/box.tsx";
import { driftVars } from "#/shared/ui/vars.ts";

const DRIFT_SPEED = 0.6;

export const Backdrop = (): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <Box className="dot-grid bg-paper absolute inset-0" vars={driftVars(frame * DRIFT_SPEED)} />
  );
};
