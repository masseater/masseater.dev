import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Line } from "#/entities/script/index.ts";
import { plainOf } from "#/entities/script/index.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popUp } from "#/shared/ui/motion.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";
import { keyed } from "#/widgets/scenes/model/keyed.ts";

const FULL_MARK = 1;

export const MetaTags = ({
  items,
  reveals,
  frame,
}: Readonly<{ items: readonly Line[]; reveals: readonly number[]; frame: number }>): ReactNode => (
  <div className="flex flex-wrap justify-center gap-4">
    {pipe(
      keyed({ values: items, label: ({ segments }) => plainOf(segments), reveals }),
      Arr.map(({ key, value, at }) => (
        <Box
          className="motion bg-ink font-text text-meta text-paper horizontal:text-meta-h rounded-full px-6 py-3 leading-tight font-extrabold"
          key={key}
          vars={popUp({ frame, at })}
        >
          <RichText mark={FULL_MARK} segments={value.segments} />
        </Box>
      )),
    )}
  </div>
);
