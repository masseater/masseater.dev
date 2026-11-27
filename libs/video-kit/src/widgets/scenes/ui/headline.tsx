import type { ReactNode } from "react";

import type { Segment } from "#/entities/script/index.ts";
import type { CssVariables } from "#/shared/lib/css-variables.ts";
import { Box } from "#/shared/ui/box.tsx";
import { RichText } from "#/shared/ui/rich-text.tsx";
import { merge, sizeVars } from "#/shared/ui/vars.ts";

export const Headline = ({
  segments,
  size,
  motion,
  mark,
}: Readonly<{
  segments: readonly Segment[];
  size: number;
  motion: CssVariables;
  mark: number;
}>): ReactNode => (
  <Box
    className="motion fitted font-impact text-ink japanese text-center leading-snug"
    vars={merge([sizeVars(size), motion])}
  >
    <RichText mark={mark} segments={segments} />
  </Box>
);
