import { Array, pipe } from "effect";
import { ToggleGroup } from "radix-ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useDirection } from "#/features/translate-text/api/translation";
import type { FormChoice } from "#/features/translate-text/model/form";
import {
  FORM_OPTIONS,
  useFormChoice,
  useSetFormChoice,
} from "#/features/translate-text/model/form";

import { FormChoiceItem } from "./form-choice-item.tsx";

const LABEL = "文体";

const isFormChoice = (value: string): value is FormChoice =>
  pipe(
    FORM_OPTIONS,
    Array.some(({ choice }) => choice === value),
  );

const FormChoiceGroup = (): ReactNode => {
  const { target } = useDirection();
  const current = useFormChoice();
  const setChoice = useSetFormChoice();
  const onValueChange = useCallback(
    (value: string) => {
      if (isFormChoice(value)) {
        setChoice(value);
      }
    },
    [setChoice],
  );
  if (target !== "ja") {
    return false;
  }
  return (
    <ToggleGroup.Root
      aria-label={LABEL}
      className="inline-flex rounded-full border p-0.5 text-xs"
      type="single"
      value={current}
      onValueChange={onValueChange}
    >
      {pipe(
        FORM_OPTIONS,
        Array.map((option) => <FormChoiceItem key={option.choice} option={option} />),
      )}
    </ToggleGroup.Root>
  );
};

export { FormChoiceGroup };
