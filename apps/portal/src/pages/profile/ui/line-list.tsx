import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { ProfileLineValue } from "#/entities/watashi/index.ts";

import { LineItem } from "./line-item.tsx";

export const LineList = ({ lines }: Readonly<{ lines: readonly ProfileLineValue[] }>): ReactNode =>
  Arr.isReadonlyArrayNonEmpty(lines) && (
    <ul className="flex flex-col gap-1.5">
      {pipe(
        lines,
        Arr.map((line) => <LineItem key={line.text} line={line} />),
      )}
    </ul>
  );
