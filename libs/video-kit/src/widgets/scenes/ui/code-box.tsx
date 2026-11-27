import { Array as Arr, Function as Fn, pipe } from "effect";
import type { ReactNode } from "react";

import { Box } from "#/shared/ui/box.tsx";
import { popIn } from "#/shared/ui/motion.ts";
import { keyed } from "#/widgets/scenes/model/keyed.ts";

import { CodeRow } from "./code-row.tsx";

const BOX_AT = 6;
const BOX_START = 0.85;

export const CodeBox = ({
  code,
  shown,
  frame,
}: Readonly<{ code: readonly string[]; shown: number; frame: number }>): ReactNode => (
  <Box
    className="motion sticker bg-ink font-code text-code horizontal:text-code-h mt-12 flex flex-col gap-2 px-10 py-9 leading-normal font-medium"
    vars={popIn({ frame, at: BOX_AT, start: BOX_START })}
  >
    {pipe(
      keyed({ values: code, label: Fn.identity, reveals: [] }),
      Arr.map(({ key, value, position }) => (
        <CodeRow key={key} row={value} shown={position < shown} />
      )),
    )}
  </Box>
);
