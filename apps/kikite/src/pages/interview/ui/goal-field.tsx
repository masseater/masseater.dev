import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useChangeSetupDraft, useSetupDraft } from "#/pages/interview/model/hooks";

import { FIELD_CLASS } from "./field-class.ts";

const LABEL = "最後に欲しいもの";
const PLACEHOLDER = "最初に作る機能の一覧";

const GoalField = (): ReactNode => {
  const { goal } = useSetupDraft();
  const change = useChangeSetupDraft();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      change({ goal: event.target.value });
    },
    [change],
  );
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{LABEL}</span>
      <input className={FIELD_CLASS} value={goal} placeholder={PLACEHOLDER} onChange={onChange} />
    </label>
  );
};

export { GoalField };
