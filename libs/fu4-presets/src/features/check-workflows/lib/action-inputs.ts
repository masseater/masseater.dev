import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { ActionMetadata } from "#/entities/action/index.ts";
import type { ExecAction } from "#/entities/workflow/index.ts";
import type { Fail } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote, sortedQuotes } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const NEWLINE_WITH_INDENT = /\s*\r?\n\s*/gu;
const TRAILING = /[. ]+$/u;

export interface InputCheck {
  readonly fail: Fail;
  readonly uses: Text;
  readonly describe: string;
}

const deprecationNote = (message: string): string =>
  pipe(message, Str.replace(TRAILING, ""), Str.replaceAll(NEWLINE_WITH_INDENT, " "));

const suffixOf = (note: string): string => {
  if (Str.isEmpty(note)) {
    return "";
  }
  return `: ${note}`;
};

const checkGiven = (
  check: InputCheck,
  metadata: ActionMetadata,
  given: ExecAction["inputs"],
): void => {
  const names = pipe(
    Rec.values(metadata.inputs),
    Arr.map((input) => input.name),
  );
  for (const [id, input] of Rec.toEntries(given ?? {})) {
    const spec = Rec.get(metadata.inputs, id);
    if (Option.isNone(spec)) {
      check.fail(
        input.name,
        `input ${quote(input.name.value)} is not defined in action ${check.describe}. available inputs are ${sortedQuotes(names)}`,
      );
    } else if (spec.value.deprecated && !spec.value.required) {
      const suffix = suffixOf(deprecationNote(spec.value.deprecationMessage));
      check.fail(
        input.name,
        `avoid using deprecated input ${quote(input.name.value)} in action ${check.describe}${suffix}`,
      );
    }
  }
};

export const checkInputs =
  (check: InputCheck) =>
  (metadata: ActionMetadata, exec: ExecAction): void => {
    checkGiven(check, metadata, exec.inputs);
    const required = pipe(
      Rec.values(metadata.inputs),
      Arr.filter((input) => input.required),
      Arr.map((input) => input.name),
    );
    for (const [id, input] of Rec.toEntries(metadata.inputs)) {
      if (input.required && !Rec.has(exec.inputs ?? {}, id)) {
        check.fail(
          check.uses,
          `missing input ${quote(input.name)} which is required by action ${check.describe}. all required inputs are ${sortedQuotes(required)}`,
        );
      }
    }
  };
