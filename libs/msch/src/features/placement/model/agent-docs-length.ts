import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const AGENT_DOC = /(?:^|\/)(?:AGENTS|CLAUDE)\.md$/u;
const RECOMMENDED_LINES = 200;
const READ_CONCURRENCY = 16;
const FIRST = 1;
const RULE: RuleName = "agent-docs-length";

const lineCount = (source: string): number => pipe(Str.trimEnd(source), Str.split("\n")).length;

const problemFor =
  (file: string) =>
  (lines: number): Option.Option<Problem> => {
    if (lines <= RECOMMENDED_LINES) {
      return Option.none();
    }
    return Option.some({
      file,
      line: RECOMMENDED_LINES + FIRST,
      column: FIRST,
      rule: RULE,
      message: `has ${String(lines)} lines. Claude Code recommends under ${String(RECOMMENDED_LINES)} lines per file: longer files cost context and are followed less reliably. Cut what the code already tells, and move rules shared across repositories into skills.`,
    });
  };

/** @internal */
export const checkAgentDocsLength = Effect.fn("checkAgentDocsLength")(
  function* checkAgentDocsLength(root: string) {
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
        return files
          .readFile(file)
          .pipe(Effect.map(Option.flatMap((source) => problemFor(file)(lineCount(source)))));
      },
      { concurrency: READ_CONCURRENCY },
    );
    return Arr.getSomes(found);
  },
);
