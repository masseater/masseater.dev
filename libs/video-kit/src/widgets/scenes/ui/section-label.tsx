import { String as Str } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import type { Segment } from "#/entities/script/index.ts";
import { plainOf } from "#/entities/script/index.ts";
import { HEADING_LANDS_AT } from "#/entities/timeline/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { slamIn } from "#/shared/ui/motion.ts";

const DIGITS = 2;
const LEAD = 3;

export const SectionLabel = ({
  number,
  heading,
}: Readonly<{ number: number; heading: readonly Segment[] }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <Box
      className="motion sticker font-pop text-label horizontal:text-label-h flex origin-left self-start leading-none"
      vars={slamIn({ frame, at: HEADING_LANDS_AT - LEAD })}
    >
      <span className="bg-ink text-highlight px-5 py-4">
        {Str.padStart(DIGITS, "0")(String(number))}
      </span>
      <span className="bg-highlight text-ink px-7 py-4">{plainOf(heading)}</span>
    </Box>
  );
};
