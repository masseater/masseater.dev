import { Array as Arr, Effect, HashMap, HashSet, Option, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { cargoDeviations, commentsByLine, workspaceDeviations } from "./deviation-entries.ts";
import type { DeviationEntry, Deviations } from "./deviation-entries.ts";
import { GRAMMAR, exitTextOf, isUnused, parseCondition } from "./exit-condition.ts";
import { exitEntries, metExits } from "./met-exits.ts";
import type { ExitEntry, MetExit } from "./met-exits.ts";

const RULE: RuleName = "upstream-exit";
const ROOT_FILES = [
  { name: "pnpm-workspace.yaml", deviationsOf: workspaceDeviations },
  { name: "Cargo.toml", deviationsOf: cargoDeviations },
] as const;
const REASON =
  "Every deviation from an upstream package is temporary, and the comment says when to go back to the official package so that msch-exits can tell.";
const STRAY =
  "An exit condition belongs at the end of the line of an overrides, patchedDependencies, packageExtensions or [patch] entry. Move it there or delete it.";

interface ReadFile {
  readonly file: string;
  readonly source: string;
  readonly deviations: Deviations;
}

const problemAt =
  ({ file, source }: ReadFile) =>
  (index: number, message: string): Problem => ({
    file,
    ...positionOf(source)(index),
    rule: RULE,
    message,
  });

const messageFor = (
  entry: DeviationEntry,
  exitText: Option.Option<string>,
): Option.Option<string> => {
  if (Option.isNone(exitText)) {
    return Option.some(
      `${entry.section} entry ${entry.key} has no exit condition. ${REASON} Add \`# exit: <condition>\` at the end of the line, where the condition is ${GRAMMAR}.`,
    );
  }
  const conditions = parseCondition(exitText.value);
  if (Option.isNone(conditions)) {
    return Option.some(
      `The exit condition \`${exitText.value}\` of ${entry.key} is not one msch-exits can check. Write ${GRAMMAR}.`,
    );
  }
  if (entry.section !== "overrides" && pipe(conditions.value, Arr.some(isUnused))) {
    return Option.some(
      `\`unused\` is checked only for overrides, by the unused-override and removable-override checks. Give ${entry.key} a condition on a release or an issue.`,
    );
  }
  return Option.none();
};

const entryProblems = (read: ReadFile): readonly Problem[] => {
  const comments = commentsByLine(read.deviations.comments);
  return pipe(
    read.deviations.entries,
    Arr.flatMap((entry) => {
      const exitText = pipe(
        HashMap.get(comments, entry.line),
        Option.flatMap(({ text }) => exitTextOf(text)),
      );
      return pipe(
        messageFor(entry, exitText),
        Option.map((message) => problemAt(read)(entry.index, message)),
        Option.toArray,
      );
    }),
  );
};

const strayProblems = (read: ReadFile): readonly Problem[] => {
  const entryLines = HashSet.fromIterable(
    pipe(
      read.deviations.entries,
      Arr.map(({ line }) => line),
    ),
  );
  return pipe(
    read.deviations.comments,
    Arr.filter(
      (comment) =>
        Option.isSome(exitTextOf(comment.text)) && !HashSet.has(entryLines, comment.line),
    ),
    Arr.map((comment) => problemAt(read)(comment.index, STRAY)),
  );
};

const readRootFiles = Effect.fn("readRootFiles")(function* readRootFiles(root: string) {
  const files = yield* RepositoryFiles;
  const read = yield* Effect.forEach(
    ROOT_FILES,
    ({ name, deviationsOf }) => {
      const file = files.join(root, name);
      return Effect.map(
        files.readFile(file),
        Option.map((source): ReadFile => ({ file, source, deviations: deviationsOf(source) })),
      );
    },
    { concurrency: "unbounded" },
  );
  return Arr.getSomes(read);
});

/** @internal */
export const checkUpstreamExits = Effect.fn("checkUpstreamExits")(function* checkUpstreamExits(
  root: string,
) {
  const read = yield* readRootFiles(root);
  return pipe(
    read,
    Arr.flatMap((file) => [...entryProblems(file), ...strayProblems(file)]),
  );
});

/** @internal */
export interface FileExit {
  readonly file: string;
  readonly met: MetExit;
}

/** @internal */
export const upstreamExitsMet = Effect.fn("upstreamExitsMet")(function* upstreamExitsMet(
  root: string,
) {
  const read = yield* readRootFiles(root);
  const perFile = yield* Effect.forEach(
    read,
    ({ file, deviations }) => {
      const entries: readonly ExitEntry[] = exitEntries(deviations);
      return Effect.map(
        metExits(entries),
        Arr.map((met): FileExit => ({ file, met })),
      );
    },
    { concurrency: 1 },
  );
  return Arr.flatten(perFile);
});
