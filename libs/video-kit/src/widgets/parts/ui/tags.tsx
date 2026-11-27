import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { NOTHING, ONE } from "#/shared/config/index.ts";
import { segmentsOf } from "#/shared/lib/segment.ts";
import { Box } from "#/shared/ui/box.tsx";
import { popUp } from "#/shared/ui/motion.ts";
import { RichText } from "#/shared/ui/rich-text.tsx";

export const Tags = ({
  items,
  at,
}: Readonly<{ items: readonly string[]; at: readonly number[] }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className="flex flex-wrap justify-center gap-4">
      {pipe(
        items,
        Arr.map((item, position) => (
          <Box
            className="motion bg-ink font-jp text-meta text-paper horizontal:text-meta-h rounded-full px-7 py-3 leading-tight font-bold"
            key={item}
            vars={popUp({ frame, at: Option.getOrElse(Arr.get(at, position), () => NOTHING) })}
          >
            <RichText mark={ONE} segments={segmentsOf(item)} />
          </Box>
        )),
      )}
    </div>
  );
};
