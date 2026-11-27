import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { NOTHING } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popUp } from "#/shared/ui/motion.ts";

export const Label = ({
  text,
  at = NOTHING,
}: Readonly<{ text: string; at?: number }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <Box
      className="motion bg-ink font-jp text-label text-highlight horizontal:text-label-h self-center px-7 py-4 leading-none font-black"
      vars={popUp({ frame, at })}
    >
      {text}
    </Box>
  );
};
