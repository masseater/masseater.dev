import { useAtom } from "@effect/atom-react";
import { useCallback } from "react";
import type { ReactNode, SubmitEvent } from "react";

import { saveAtom } from "#/features/mark-range/model/save";

import { AspectChips } from "./aspect-chips.tsx";
import { FormActions } from "./form-actions.tsx";
import { RangeReadout } from "./range-readout.tsx";
import { VerbSwitch } from "./verb-switch.tsx";
import { WordsField } from "./words-field.tsx";

export const MarkForm = (): ReactNode => {
  const [saved, save] = useAtom(saveAtom);
  const submit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      save();
    },
    [save],
  );
  return (
    <form aria-label="しるし" className="grid gap-3" onSubmit={submit}>
      <RangeReadout />
      <VerbSwitch />
      <AspectChips />
      <WordsField />
      <FormActions saving={saved.waiting} />
    </form>
  );
};
