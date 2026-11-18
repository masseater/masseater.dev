import type { Project } from "@r_masseater/fu4";
import { Option, Result, String as Str, pipe } from "effect";

import { containsExpression, findReusable, skipReusable } from "#/entities/workflow/index.ts";
import type { WorkflowCall } from "#/entities/workflow/index.ts";
import { checkReusableCall } from "#/features/check-workflows/lib/reusable-call.ts";
import { NOOP, workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import { isSelfReferenceWithRef, localPath, selfReferenceError } from "#/shared/uses/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const SEPARATORS: readonly string[] = ["/", "/", "@"];
const NONE = 0;
const NEXT = 1;

const isLocalFormat = (uses: string): boolean =>
  Option.exists(
    localPath(uses),
    (rest) =>
      Str.isNonEmpty(rest) &&
      Option.match(Str.indexOf("@")(rest), {
        onNone: () => true,
        onSome: (index) => index === NONE,
      }),
  );

const isRepoFormat = (uses: string): boolean => {
  if (Str.startsWith(".")(uses)) {
    return false;
  }
  let rest = uses;
  for (const separator of SEPARATORS) {
    const index = Str.indexOf(separator)(rest);
    if (Option.isNone(index) || index.value === NONE) {
      return false;
    }
    rest = Str.slice(index.value + NEXT)(rest);
  }
  return Str.isNonEmpty(rest);
};

interface Env {
  readonly fail: Fail;
  readonly project: Project;
}

const checkLocal = ({ fail, project }: Env, call: WorkflowCall, uses: Text): void => {
  for (const found of Option.toArray(findReusable(project)(uses.value))) {
    Result.match(found, {
      onFailure: (message) => {
        fail(uses, message);
      },
      onSuccess: (metadata) => {
        checkReusableCall({ fail, uses })(call, metadata);
      },
    });
  }
};

const failMalformed = ({ fail, project }: Env, uses: Text): void => {
  if (Str.startsWith("./")(uses.value)) {
    skipReusable(project)(uses.value);
  }
  fail(
    uses,
    `reusable workflow call ${quote(uses.value)} at "uses" is not following the format "owner/repo/path/to/workflow.yml@ref" nor "./path/to/workflow.yml". see https://docs.github.com/en/actions/learn-github-actions/reusing-workflows for more details`,
  );
};

const checkUses = (env: Env, call: WorkflowCall, uses: Text): void => {
  const { fail } = env;
  if (isLocalFormat(uses.value)) {
    checkLocal(env, call, uses);
    return;
  }
  if (isRepoFormat(uses.value)) {
    return;
  }
  if (isSelfReferenceWithRef(uses.value)) {
    fail(uses, selfReferenceError(uses.value));
    return;
  }
  failMalformed(env, uses);
};

const usesOf = (call: WorkflowCall): Option.Option<Text> =>
  pipe(
    Option.fromNullishOr(call.uses),
    Option.filter((uses) => Str.isNonEmpty(uses.value) && !containsExpression(uses.value)),
  );

export const workflowCall = workflowRule({
  description:
    "Reports reusable workflow calls with a malformed uses or inputs and secrets that the callee does not declare",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-workflow-call-syntax",
  visitor: (fail, context): Visitor => ({
    ...NOOP,
    jobPre: (job) => {
      for (const call of Option.toArray(Option.fromNullishOr(job.workflowCall))) {
        for (const uses of Option.toArray(usesOf(call))) {
          checkUses({ fail, project: context.project }, call, uses);
        }
      }
    },
  }),
});
