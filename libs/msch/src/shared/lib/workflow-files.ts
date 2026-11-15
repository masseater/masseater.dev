import { Array as Arr, Effect, Option, pipe } from "effect";

import { RepositoryFiles } from "./repository-files.ts";

const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/u;
const READ_CONCURRENCY = 16;

export interface WorkflowFile {
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
