import { useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import type { ReactNode } from "react";

import { verdictAtom } from "#/features/judge-habit/model/decide.ts";
import type { Decision } from "#/features/judge-habit/model/decide.ts";

import { DecideForm } from "./decide-form.tsx";
import { VerdictSwitch } from "./verdict-switch.tsx";

export const Decide = ({ decision }: Readonly<{ decision: Decision }>): ReactNode => {
  const verdict = useAtomValue(verdictAtom(decision.habit));
  return (
    <div className="grid justify-items-start gap-3">
      <VerdictSwitch habit={decision.habit} />
      {Option.isSome(verdict) && <DecideForm decision={decision} verdict={verdict.value} />}
    </div>
  );
};
