import { RangeReadout, useSubmit } from "@masseater.dev/media-notes-ui";
import type { ReactNode } from "react";

import { saveAtom } from "#/features/mark-range/model/save";

import { AspectChips } from "./aspect-chips.tsx";
import { FormActions } from "./form-actions.tsx";
import { VerbSwitch } from "./verb-switch.tsx";
import { WordsField } from "./words-field.tsx";

export const MarkForm = (): ReactNode => {
  const { waiting, submit } = useSubmit(saveAtom);
  return (
    <form aria-label="しるし" className="grid gap-3" onSubmit={submit}>
      <RangeReadout />
      <VerbSwitch />
      <AspectChips />
      <WordsField />
      <FormActions saving={waiting} />
    </form>
  );
};
