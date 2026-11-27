import type { ReactNode } from "react";
import { Img, useCurrentFrame } from "remotion";

import { NOTHING } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popUp } from "#/shared/ui/motion.ts";

export const Picture = ({
  src,
  at = NOTHING,
  className = "w-4/5",
}: Readonly<{ src: string; at?: number; className?: string }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <Box className={`motion ${className}`} vars={popUp({ frame, at })}>
      <Img className="size-full object-contain" src={src} />
    </Box>
  );
};
