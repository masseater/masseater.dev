import type { ReactNode } from "react";

import { NOTHING } from "#/shared/config/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popUp } from "#/shared/ui/motion.ts";

const TAG = "ひとことで言うと";

export const EndingTag = ({ frame }: Readonly<{ frame: number }>): ReactNode => (
  <Box
    className="motion bg-ink font-pop text-label text-highlight horizontal:text-label-h px-7 py-4 leading-none"
    vars={popUp({ frame, at: NOTHING })}
  >
    {TAG}
  </Box>
);
