import { Option } from "effect";
import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi/model/memo";

const RETRACTED = "取り消し済み";

const RetractedNote = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode =>
  Option.match(Option.fromUndefinedOr(memo.retracted), {
    onNone: () => false,
    onSome: ({ reason }) => (
      <p className="text-destructive/80 text-xs">{`${RETRACTED} ${reason}`}</p>
    ),
  });

export { RetractedNote };
