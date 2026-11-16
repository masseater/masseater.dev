import { RangeReadout, useSubmit } from "@masseater.dev/media-notes-ui";
import type { ReactNode } from "react";

import { saveAtom } from "#/features/write-comment/model/save.ts";

import { FormActions } from "./form-actions.tsx";
import { WordsField } from "./words-field.tsx";

export const CommentForm = (): ReactNode => {
  const { waiting, submit } = useSubmit(saveAtom);
  return (
    <form aria-label="コメント" className="grid gap-3" onSubmit={submit}>
      <RangeReadout />
      <WordsField />
      <FormActions saving={waiting} />
    </form>
  );
};
