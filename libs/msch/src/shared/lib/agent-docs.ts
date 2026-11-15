import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Problem } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";

const AGENT_DOC = /(?:^|\/)(?:AGENTS|CLAUDE)\.md$/u;
const READ_CONCURRENCY = 16;

export const agentDocProblems = Effect.fn("agentDocProblems")(function* agentDocProblems(
  root: string,
  problemIn: (file: string) => (source: string) => Option.Option<Problem>,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const docs = pipe(
    listed,
    Arr.filter((name) => AGENT_DOC.test(name)),
  );
  const found = yield* Effect.forEach(
    docs,
    (name) => {
      const file = files.join(root, name);
      const problemOf = Option.flatMap(problemIn(file));
      return files.readFile(file).pipe(Effect.map(problemOf));
    },
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.getSomes(found);
});
