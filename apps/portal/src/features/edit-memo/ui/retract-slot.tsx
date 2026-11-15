import { Option } from "effect";
import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi/index.ts";

import { MemoRetract } from "./memo-retract";

export const RetractSlot = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode =>
  Option.match(Option.fromUndefinedOr(memo.retracted), {
    onNone: () => <MemoRetract memo={memo} />,
    onSome: () => false,
  });
