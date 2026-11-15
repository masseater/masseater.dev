import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";
import { runScriptsOf } from "#/shared/lib/workflow-run.ts";
import type { RunScript } from "#/shared/lib/workflow-run.ts";

const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/u;
const COMMAND_CHAIN = /&&|\|\||;|\|/u;
const QUOTED = /\$\{\{.*?\}\}|"(?:[^"\\]|\\.)*"|'[^']*'/gu;
const COMMENT = "#";
const RULE: RuleName = "workflow-script";
const READ_CONCURRENCY = 16;
const ONE_COMMAND = 1;
const MESSAGE =
  "runs more than one command. Keep a step to one command, `vp run <task>` or `vp exec <bin>`, and put the logic in a Vite+ task in TypeScript.";

const isCommand = (line: string): boolean => Str.isNonEmpty(line) && !Str.startsWith(COMMENT)(line);

const chainsCommands = (line: string): boolean =>
  COMMAND_CHAIN.test(Str.replaceAll(QUOTED, "")(line));

const runsMoreThanOneCommand = ({ text }: RunScript): boolean => {
  const lines = pipe(Str.split("\n")(text), Arr.map(Str.trim), Arr.filter(isCommand));
  return lines.length > ONE_COMMAND || pipe(lines, Arr.some(chainsCommands));
};

const problemsIn =
  (file: string) =>
  (source: string): readonly Problem[] => {
    const at = positionOf(source);
    return pipe(
      runScriptsOf(source),
      Arr.filter(runsMoreThanOneCommand),
      Arr.map(({ start }) => ({ file, ...at(start), rule: RULE, message: MESSAGE })),
    );
  };

/** @internal */
export const checkWorkflows = Effect.fn("checkWorkflows")(function* checkWorkflows(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const workflows = pipe(
    names,
    Arr.filter((name) => WORKFLOW_FILE.test(name)),
  );
  const found = yield* Effect.forEach(
    workflows,
    (name) => {
      const file = files.join(root, name);
      return files.readFile(file).pipe(
        Effect.map((text) =>
          pipe(
            text,
            Option.map(problemsIn(file)),
            Option.getOrElse(() => []),
          ),
        ),
      );
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
