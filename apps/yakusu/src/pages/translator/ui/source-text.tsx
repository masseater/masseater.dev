import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { MAX_CHARACTERS, useDraft, useSetDraft } from "#/pages/translator/model/draft.ts";

const LABEL = "原文";

const SourceText = (): ReactNode => {
  const draft = useDraft();
  const setDraft = useSetDraft();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(event.currentTarget.value);
    },
    [setDraft],
  );
  return (
    <textarea
      aria-label={LABEL}
      className="min-h-56 flex-1 resize-none bg-transparent py-5 pr-14 pl-6 text-2xl leading-relaxed outline-none"
      maxLength={MAX_CHARACTERS}
      spellCheck={false}
      value={draft}
      onChange={onChange}
    />
  );
};

export { SourceText };
