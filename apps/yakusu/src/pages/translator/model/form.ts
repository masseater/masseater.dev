import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { Atom } from "effect/reactivity";

import type { Form } from "#/shared/api";

import type { LanguageCode } from "./languages.ts";

export type FormChoice = "auto" | Form;

export type FormOption = Readonly<{ choice: FormChoice; label: string }>;

export const FORM_OPTIONS: readonly FormOption[] = [
  { choice: "auto", label: "自動" },
  { choice: "polite", label: "です・ます" },
  { choice: "plain", label: "である" },
];

const formChoiceAtom = Atom.make<FormChoice>("auto");

export const formFor = ({
  target,
  choice,
}: Readonly<{ target: LanguageCode; choice: FormChoice }>): Option.Option<Form> => {
  if (target !== "ja" || choice === "auto") {
    return Option.none();
  }
  return Option.some(choice);
};

export const useFormChoice = (): FormChoice => useAtomValue(formChoiceAtom);

export const useSetFormChoice = (): ((choice: FormChoice) => void) => useAtomSet(formChoiceAtom);
