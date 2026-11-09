import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Choices } from "#/pages/ranking/model/labels";

import { ChoiceButton } from "./choice-button";

const ChoiceGroup = <Value extends string>({
  label,
  labels,
  value,
  onChoose,
}: Readonly<{
  label: string;
  labels: Choices<Value>;
  value: Value;
  onChoose: (next: Value) => void;
}>): ReactNode => (
  <fieldset className="flex flex-wrap items-center gap-1">
    <legend className="sr-only">{label}</legend>
    {pipe(
      labels,
      Arr.map(([choice, text]) => (
        <ChoiceButton
          key={choice}
          value={choice}
          text={text}
          selected={choice === value}
          onChoose={onChoose}
        />
      )),
    )}
  </fieldset>
);

export { ChoiceGroup };
