import { Array as Arr, Record as Rec, pipe } from "effect";

import type { WorkflowCall, ReusableMetadata } from "#/entities/workflow/index.ts";
import type { Fail } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote, sortedQuotes } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

interface Declared {
  readonly name: string;
  readonly required: boolean;
}

interface Section {
  readonly kind: "input" | "secret";
  readonly declared: Readonly<Record<string, Declared>>;
  readonly given: WorkflowCall["inputs"];
}

const SINGLE = 1;

const note = (kind: string, names: readonly string[]): string => {
  if (Arr.isReadonlyArrayEmpty(names)) {
    return `no ${kind} is defined`;
  }
  if (names.length === SINGLE) {
    return `defined ${kind} is ${sortedQuotes(names)}`;
  }
  return `defined ${kind}s are ${sortedQuotes(names)}`;
};

const checkSection =
  (fail: Fail, uses: Text) =>
  (section: Section): void => {
    const spec = quote(uses.value);
    for (const [id, declared] of Rec.toEntries(section.declared)) {
      if (declared.required && !Rec.has(section.given, id)) {
        fail(
          uses,
          `${section.kind} ${quote(declared.name)} is required by ${spec} reusable workflow`,
        );
      }
    }
    const names = pipe(
      Rec.values(section.declared),
      Arr.map((declared) => declared.name),
    );
    for (const [id, value] of Rec.toEntries(section.given)) {
      if (!Rec.has(section.declared, id)) {
        fail(
          value.name,
          `${section.kind} ${quote(value.name.value)} is not defined in ${spec} reusable workflow. ${note(section.kind, names)}`,
        );
      }
    }
  };

export const checkReusableCall =
  ({ fail, uses }: { readonly fail: Fail; readonly uses: Text }) =>
  (call: WorkflowCall, metadata: ReusableMetadata): void => {
    const check = checkSection(fail, uses);
    check({ kind: "input", declared: metadata.inputs, given: call.inputs });
    if (!call.inheritSecrets) {
      check({ kind: "secret", declared: metadata.secrets, given: call.secrets });
    }
  };
