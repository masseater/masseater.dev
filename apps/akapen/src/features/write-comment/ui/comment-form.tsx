import { useAtom } from "@effect/atom-react";
import { RangeReadout } from "@masseater.dev/media-notes-ui";
import { useCallback } from "react";
import type { ReactNode, SubmitEvent } from "react";

import { saveAtom } from "#/features/write-comment/model/save";

import { FormActions } from "./form-actions.tsx";
import { WordsField } from "./words-field.tsx";

export const CommentForm = (): ReactNode => {
  const [saved, save] = useAtom(saveAtom);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      save();
    },
    [save],
  );
  return (
    <form aria-label="コメント" className="grid gap-3" onSubmit={submit}>
      <RangeReadout />
      <WordsField />
      <FormActions saving={saved.waiting} />
    </form>
  );
};
