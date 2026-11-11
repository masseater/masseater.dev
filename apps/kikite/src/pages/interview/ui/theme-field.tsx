import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useChangeSetupDraft, useSetupDraft } from "#/pages/interview/model/hooks";

import { FIELD_CLASS } from "./field-class.ts";

const LABEL = "テーマ";
const PLACEHOLDER = "作りたい個人アプリの中身";
const ROWS = 3;

const ThemeField = (): ReactNode => {
  const { theme } = useSetupDraft();
  const change = useChangeSetupDraft();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      change({ theme: event.target.value });
    },
    [change],
  );
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{LABEL}</span>
      <textarea
        required
        rows={ROWS}
        className={FIELD_CLASS}
        value={theme}
        placeholder={PLACEHOLDER}
        onChange={onChange}
      />
    </label>
  );
};

export { ThemeField };
