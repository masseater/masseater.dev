import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import type { Judgment, Library } from "#/entities/library/index.ts";
import { UndoButton } from "#/features/judge-habit/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";
import { VerdictChip } from "#/shared/ui/index.ts";

import { JudgedNote } from "./judged-note.tsx";

export const JudgedRow = ({
  library,
  judgment,
}: Readonly<{ library: Library; judgment: Judgment }>): ReactNode => {
  const aim = pipe(
    Option.fromNullishOr(judgment.aim),
    Option.flatMap((id) =>
      pipe(
        library.aims,
        Arr.findFirst((each) => each.id === id),
      ),
    ),
  );
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <VerdictChip verdict={judgment.verdict} />
      <JudgedNote
        aim={pipe(
          aim,
          Option.map((found) => ({
            name: found.name,
            href: hrefOf({ page: "category", style: judgment.style, category: found.category }),
          })),
        )}
        reason={judgment.reason ?? ""}
      />
      <UndoButton current={judgment.style} habit={judgment.habit} />
    </div>
  );
};
