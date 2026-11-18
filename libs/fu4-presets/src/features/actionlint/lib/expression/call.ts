import type { Project } from "@r_masseater/fu4";
import { Option, Record as Rec, Result, pipe } from "effect";

import { findReusable } from "#/entities/workflow/index.ts";
import type { WorkflowCall } from "#/entities/workflow/model/job-types.ts";
import type { CallInput } from "#/entities/workflow/model/reusable.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { checkCallInputs } from "./call-input.ts";
import type { ExprEnv } from "./env.ts";
import { checkString } from "./strings.ts";
import type { Maybe } from "./strings.ts";

const inputsOf = (
  env: ExprEnv,
  project: Project,
  uses: Text,
): Readonly<Record<string, CallInput>> =>
  Option.match(findReusable(project)(uses.value), {
    onNone: () => ({}),
    onSome: (result) =>
      Result.match(result, {
        onFailure: (message) => {
          env.fail(uses, message);
          return {};
        },
        onSuccess: (metadata) => metadata.inputs,
      }),
  });

const usesOf = (call: WorkflowCall): Option.Option<readonly [WorkflowCall, Text]> =>
  pipe(
    Option.fromNullishOr(call.uses),
    Option.map((uses) => [call, uses] as const),
  );

export const checkCall =
  (env: ExprEnv) =>
  (project: Project) =>
  (found: Maybe<WorkflowCall>): void => {
    const call = pipe(Option.fromNullishOr(found), Option.flatMap(usesOf));
    for (const [each, uses] of Option.toArray(call)) {
      checkString(env)(uses, "");
      const declared = inputsOf(env, project, uses);
      checkCallInputs({ env, uses, declared })(each);
      for (const secret of Rec.values(each.secrets)) {
        checkString(env)(secret.value, "jobs.<job_id>.secrets.<secret_id>");
      }
    }
  };
