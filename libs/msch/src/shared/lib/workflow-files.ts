import { Array as Arr, Effect, Option, pipe } from "effect";
import { parseDocument, visit } from "yaml";

import type { Finding, Problem } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { positionOf } from "./text-position.ts";

const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/u;
const READ_CONCURRENCY = 16;

interface WorkflowFile {
  readonly file: string;
  readonly source: string;
}

export const readWorkflows = Effect.fn("readWorkflows")(function* readWorkflows(root: string) {
  const files = yield* RepositoryFiles;
  const names = yield* files.listedFiles(root);
  const found = yield* Effect.forEach(
    pipe(
      names,
      Arr.filter((name) => WORKFLOW_FILE.test(name)),
    ),
    (name) => {
      const file = files.join(root, name);
      return files
        .readFile(file)
        .pipe(Effect.map(Option.map((source): WorkflowFile => ({ file, source }))));
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.getSomes(found);
});

export type PairEntry = Readonly<{ key: unknown; value: unknown }>;

export const pairOffsets =
  (offsetsIn: (pair: PairEntry) => readonly number[]) =>
  (source: string): readonly number[] => {
    const found: number[] = [];
    visit(parseDocument(source), {
      Pair: (_key, { key, value }) => {
        found.push(...offsetsIn({ key, value }));
      },
    });
    return found;
  };

export const workflowProblems = Effect.fn("workflowProblems")(function* workflowProblems(
  root: string,
  { rule, message }: Finding,
  offsetsOf: (source: string) => readonly number[],
) {
  const workflows = yield* readWorkflows(root);
  return pipe(
    workflows,
    Arr.flatMap(({ file, source }): readonly Problem[] => {
      const at = positionOf(source);
      return pipe(
        offsetsOf(source),
        Arr.map((offset): Problem => {
          const { line, column } = at(offset);
          return { file, line, column, rule, message };
        }),
      );
    }),
  );
});
