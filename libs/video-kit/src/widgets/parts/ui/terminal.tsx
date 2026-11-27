import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

import { NOTHING } from "#/shared/config/index.ts";

import { TerminalRow } from "./terminal-row.tsx";

export const Terminal = ({
  rows,
  at,
}: Readonly<{ rows: readonly string[]; at: readonly number[] }>): ReactNode => {
  const frame = useCurrentFrame();
  return (
    <div className="bg-ink font-code text-code horizontal:text-code-h flex flex-col gap-2 rounded-2xl px-10 py-9 leading-normal font-medium">
      {pipe(
        rows,
        Arr.map((row, position) => (
          <TerminalRow
            key={`${String(position)}:${row}`}
            row={row}
            shown={frame >= Option.getOrElse(Arr.get(at, position), () => NOTHING)}
          />
        )),
      )}
    </div>
  );
};
