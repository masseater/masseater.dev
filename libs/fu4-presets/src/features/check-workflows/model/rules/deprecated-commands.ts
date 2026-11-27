import { Array as Arr, Option, Predicate, Record as Rec, String as Str, pipe } from "effect";

import type { Step } from "#/entities/workflow/index.ts";
import { runOf } from "#/features/check-workflows/lib/step.ts";
import { NOOP, workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const COMMAND =
  /::(?<named>save-state|set-output|set-env)\s+name=[A-Za-z][\w-]*::\S+|::(?<path>add-path)::\S+/gu;
const ALTERNATIVES: Readonly<Record<string, string>> = {
  "set-output": 'echo "{name}={value}" >> $GITHUB_OUTPUT',
  "save-state": 'echo "{name}={value}" >> $GITHUB_STATE',
  "set-env": 'echo "{name}={value}" >> $GITHUB_ENV',
};
const PATH_ALTERNATIVE = 'echo "{path}" >> $GITHUB_PATH';

export const scriptOf = (step: Step): readonly Text[] =>
  pipe(
    runOf(step),
    Option.flatMap((run) => Option.fromNullishOr(run.run)),
    Option.toArray,
  );

export const deprecatedCommands = workflowRule({
  description: "Reports workflow commands GitHub removed, such as set-output",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-deprecated-workflow-commands",
  visitor: (fail): Visitor => ({
    ...NOOP,
    step: (step): void => {
      for (const script of scriptOf(step)) {
        for (const match of Str.matchAll(COMMAND)(script.value)) {
          const command = pipe(
            Option.fromNullishOr(match.groups),
            Option.flatMap((groups) =>
              Arr.findFirst([groups["named"], groups["path"]], Predicate.isString),
            ),
            Option.getOrElse(() => ""),
          );
          const alternative = Option.getOrElse(
            Rec.get(ALTERNATIVES, command),
            () => PATH_ALTERNATIVE,
          );
          fail(
            script,
            `workflow command ${quote(command)} was deprecated. use \`${alternative}\` instead: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions`,
          );
        }
      }
    },
  }),
});
