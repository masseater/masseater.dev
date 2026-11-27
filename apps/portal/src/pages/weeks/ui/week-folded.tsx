import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi/index.ts";

import { WeekBody } from "./week-body.tsx";

const SEPARATOR = " ／ ";

export const WeekFolded = ({ memos }: Readonly<{ memos: readonly MemoValue[] }>): ReactNode => (
  <details className="min-w-0">
    <summary className="hover:bg-accent -mx-2 cursor-pointer rounded-md px-2 font-bold">
      {pipe(
        memos,
        Arr.map((memo) => memo.description),
        Arr.join(SEPARATOR),
      )}
    </summary>
    <div className="mt-3">
      <WeekBody headless memos={memos} />
    </div>
  </details>
);
