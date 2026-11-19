import { defineRule, lintText } from "@r_masseater/fu4";
import type { Fu4Config, Fu4Error, InputKind, RuleContext } from "@r_masseater/fu4";
import { Effect, Option } from "effect";

import type { AuditInput, WorkflowInput } from "#/features/audit-workflows/model/input.ts";

import { inputOf } from "./input.ts";
import type { Outcome } from "./zizmor-units.test.support.ts";

export type Checked = Effect.Effect<Outcome, Fu4Error>;

const captured = new Map<string, AuditInput>();

const capture = defineRule({
  meta: { description: "Keeps the audit input fu4 builds", kinds: ["workflow", "action"] },
  check: (context: RuleContext) =>
    Effect.sync(() => {
      for (const input of Option.toArray(inputOf(context.kind)(context.filename)(context.source))) {
        captured.set(context.filename, input);
      }
    }),
});

const CONFIG: Fu4Config = {
  plugins: { capture: { rules: { capture } } },
  rules: { "capture/capture": "error" },
};

export interface Lintable {
  readonly root: string;
  readonly path: string;
  readonly kind: InputKind;
  readonly text: string;
}

export const NOT_BUILT = "fu4 built no input";

export const inputFor = Effect.fn("inputFor")(function* inputFor(lintable: Lintable) {
  yield* lintText({ ...lintable, config: CONFIG });
  return Option.fromNullishOr(captured.get(lintable.path));
});

export const workflowOf = (input: AuditInput): Option.Option<WorkflowInput> => {
  if (input.kind === "workflow") {
    return Option.some(input);
  }
  return Option.none();
};

export const SEQUENTIAL = { concurrency: 1 } as const;
