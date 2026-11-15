import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import type { Range } from "yaml";
import { isPair, isScalar, parseDocument, visit } from "yaml";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";
import { readWorkflows } from "#/shared/lib/workflow-files.ts";

const COMMAND_CHAIN = /&&|\|\||;|\|/u;
const QUOTED = /\$\{\{.*?\}\}|"(?:[^"\\]|\\.)*"|'[^']*'/gu;
const COMMENT = "#";
const RUN_KEY = "run";
const RULE: RuleName = "workflow-script";
const START = 0;
const ONE_COMMAND = 1;
const MESSAGE =
  "runs more than one command. Keep a step to one command, `vp run <task>` or `vp exec <bin>`, and put the logic in a Vite+ task in TypeScript.";

interface RunScript {
  readonly text: string;
  readonly start: number;
}

const startOf = (range: Readonly<Range> | null | undefined): number =>
  pipe(
    Option.fromNullishOr(range),
    Option.map(([start]) => start),
    Option.getOrElse(() => START),
  );

const runScriptsOf = (source: string): readonly RunScript[] => {
  const found: RunScript[] = [];
  visit(parseDocument(source), {
    Pair: (_key, pair) => {
      if (
        isPair(pair) &&
        isScalar(pair.key) &&
        pair.key.value === RUN_KEY &&
        isScalar(pair.value) &&
        typeof pair.value.value === "string"
      ) {
        found.push({ text: pair.value.value, start: startOf(pair.value.range) });
      }
    },
  });
  return found;
};

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
  const workflows = yield* readWorkflows(root);
  return pipe(
    workflows,
    Arr.flatMap(({ file, source }) => problemsIn(file)(source)),
  );
});
