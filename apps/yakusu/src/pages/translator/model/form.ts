import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Form } from "#/shared/api";

import type { LanguageCode } from "./languages.ts";

type FormChoice = "auto" | Form;

type FormOption = Readonly<{ choice: FormChoice; label: string }>;

const FORM_OPTIONS: readonly FormOption[] = [
  { choice: "auto", label: "自動" },
  { choice: "polite", label: "です・ます" },
  { choice: "plain", label: "である" },
];

const formChoiceAtom = Atom.make<FormChoice>("auto");

const formFor = ({
  target,
  choice,
}: Readonly<{ target: LanguageCode; choice: FormChoice }>): Option.Option<Form> => {
  if (target !== "ja" || choice === "auto") {
    return Option.none();
  }
  return Option.some(choice);
};

const useFormChoice = (): FormChoice => useAtomValue(formChoiceAtom);

const useSetFormChoice = (): ((choice: FormChoice) => void) => useAtomSet(formChoiceAtom);

export { FORM_OPTIONS, formFor, useFormChoice, useSetFormChoice };
export type { FormChoice, FormOption };
