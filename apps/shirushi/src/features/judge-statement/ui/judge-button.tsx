import { useAtomSet } from "@effect/atom-react";
import type { Judgement, Statement } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { judgeAtom } from "#/features/judge-statement/model/judge.ts";
import { TOGGLE } from "#/shared/ui/index.ts";

const LABELS: Readonly<Record<Judgement, string>> = { right: "合ってる", wrong: "違う" };

export const JudgeButton = ({
  statement,
  judgement,
}: Readonly<{ statement: Statement; judgement: Judgement }>): ReactNode => {
  const judge = useAtomSet(judgeAtom);
  const pick = useCallback(() => {
    judge({ id: statement.id, judgement });
  }, [judge, statement.id, judgement]);
  const chosen = Option.contains(Option.fromNullishOr(statement.judgement), judgement);
  return (
    <button type="button" aria-pressed={chosen} className={TOGGLE} onClick={pick}>
      {LABELS[judgement]}
    </button>
  );
};
