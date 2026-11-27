import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi/index.ts";

import { MemoViewBlock } from "./memo-view-block.tsx";

export const WeekBody = ({
  headless,
  memos,
}: Readonly<{ headless: boolean; memos: readonly MemoValue[] }>): ReactNode => (
  <div className="flex min-w-0 flex-col gap-5">
    {pipe(
      memos,
      Arr.map((memo) => <MemoViewBlock headless={headless} key={memo.ref} memo={memo} />),
    )}
  </div>
);
