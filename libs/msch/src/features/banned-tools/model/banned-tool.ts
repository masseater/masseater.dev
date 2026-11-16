import { Array as Arr, Effect, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { isScannedText, listedFiles, presentFiles, scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const WHOLE_MATCH = 0;

export interface BannedTool {
  readonly fileRule: RuleName;
  readonly commandRule: RuleName;
  readonly isFile: (entry: Listed) => boolean;
  readonly patternsFor: (entry: Listed) => readonly RegExp[];
  readonly fileMessage: (entry: Listed) => string;
  readonly commandMessage: (command: string) => string;
}

const fileProblem =
  (tool: BannedTool) =>
  (entry: Listed): Problem => ({
    file: entry.file,
    line: FIRST_LINE,
    column: FIRST_COLUMN,
    rule: tool.fileRule,
    message: tool.fileMessage(entry),
  });

const commandProblem =
  (tool: BannedTool, entry: Listed, source: string) =>
  (found: RegExpMatchArray): Problem => ({
    file: entry.file,
    ...positionOf(source)(found.index ?? WHOLE_MATCH),
    rule: tool.commandRule,
    message: tool.commandMessage(Str.trim(found[WHOLE_MATCH])),
  });

const commandProblems =
  (tool: BannedTool) =>
  (entry: Listed, source: string): readonly Problem[] =>
    pipe(
      tool.patternsFor(entry),
      Arr.flatMap((pattern) => Arr.fromIterable(Str.matchAll(pattern)(source))),
      Arr.map(commandProblem(tool, entry, source)),
    );

/** @internal */
export const checkBannedTool = Effect.fn("checkBannedTool")(function* checkBannedTool(
  root: string,
  tool: BannedTool,
) {
  const listed = yield* listedFiles(root);
  const isScanned = (entry: Listed): boolean => !tool.isFile(entry) && isScannedText(entry);
  const scanned = yield* scanText(pipe(listed, Arr.filter(isScanned)), commandProblems(tool));
  const present = yield* presentFiles(pipe(listed, Arr.filter(tool.isFile)));
  return [...pipe(present, Arr.map(fileProblem(tool))), ...scanned];
});
