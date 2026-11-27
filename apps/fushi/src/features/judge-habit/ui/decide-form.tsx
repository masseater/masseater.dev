import { useAtomSet } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ReactNode, SubmitEvent } from "react";

import { judgeAtom } from "#/features/judge-habit/model/decide.ts";
import type { Decision } from "#/features/judge-habit/model/decide.ts";
import { LABELS, VERDICT_ACTIONS } from "#/shared/config/index.ts";
import type { Verdict } from "#/shared/config/index.ts";

import { AimFields } from "./aim-fields.tsx";
import { TextField } from "./text-field.tsx";

export const DecideForm = ({
  decision,
  verdict,
}: Readonly<{ decision: Decision; verdict: Verdict }>): ReactNode => {
  const judge = useAtomSet(judgeAtom);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      judge(decision);
    },
    [judge, decision],
  );
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
      {verdict === "reject" && <TextField habit={decision.habit} label={LABELS.reason} />}
      {verdict !== "reject" && <AimFields habit={decision.habit} aims={decision.aims} />}
      <Button type="submit" size="sm">
        {VERDICT_ACTIONS[verdict]}
      </Button>
    </form>
  );
};
