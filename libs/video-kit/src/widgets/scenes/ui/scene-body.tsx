import type { ReactNode } from "react";

import type { TimedLine } from "#/entities/script/index.ts";
import type { CssVariables } from "#/shared/lib/css-variables.ts";
import { Box } from "#/shared/ui/box.tsx";

import { Caption } from "./caption.tsx";

export const SceneBody = ({
  stage,
  lines,
  caption,
  children,
}: Readonly<{
  stage: CssVariables;
  lines: readonly TimedLine[];
  caption: boolean;
  children: ReactNode;
}>): ReactNode => {
  if (!caption) {
    return (
      <div className="safe-area horizontal:safe-area-h">
        <Box className="stage flex min-h-0 flex-1 flex-col" vars={stage}>
          {children}
        </Box>
      </div>
    );
  }
  return (
    <div className="safe-area horizontal:safe-area-h">
      <Box className="stage flex min-h-0 flex-1 flex-col" vars={stage}>
        {children}
      </Box>
      <Caption lines={lines} />
    </div>
  );
};
