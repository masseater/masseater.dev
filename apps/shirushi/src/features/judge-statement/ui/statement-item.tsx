import type { Statement } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { JudgeButton } from "./judge-button.tsx";

export const StatementItem = ({ statement }: Readonly<{ statement: Statement }>): ReactNode => (
  <li className="grid gap-2 py-3">
    <p className="text-sm">{statement.words}</p>
    {Arr.isReadonlyArrayNonEmpty(statement.evidence) && (
      <ul className="text-muted-foreground grid gap-0.5 text-xs">
        {pipe(
          statement.evidence,
          Arr.map((evidence) => (
            <li key={evidence} className="truncate">
              {evidence}
            </li>
          )),
        )}
      </ul>
    )}
    <fieldset aria-label="判定" className="m-0 flex min-w-0 gap-1 border-0 p-0">
      <JudgeButton statement={statement} judgement="right" />
      <JudgeButton statement={statement} judgement="wrong" />
    </fieldset>
  </li>
);
