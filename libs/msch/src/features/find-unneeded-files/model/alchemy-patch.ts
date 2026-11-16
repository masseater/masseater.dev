import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { parse } from "yaml";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "alchemy-patch";
const WORKSPACE_FILE = "pnpm-workspace.yaml";
const ALCHEMY = /^(?:alchemy|@alchemy\.run\/[^@]+)(?:@.*)?$/u;
const START = 0;

const WorkspaceFile = Schema.Struct({
  patchedDependencies: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
});
const decodeWorkspaceFile = Schema.decodeUnknownOption(WorkspaceFile);

const patchedIn = (source: string): readonly string[] =>
  pipe(
    decodeWorkspaceFile(parse(source)),
    Option.flatMap(({ patchedDependencies }) => Option.fromUndefinedOr(patchedDependencies)),
    Option.map(Rec.keys),
    Option.getOrElse((): readonly string[] => []),
  );

const problemOf = (
  file: string,
  position: Pick<Problem, "line" | "column">,
  name: string,
): Problem => ({
  file,
  ...position,
  rule: RULE,
  message: `patches ${name}. A patch breaks on every Alchemy release. Define the missing setting as a custom resource in the stack and delete the patch.`,
});

const problemsIn =
  (file: string) =>
  (source: string): readonly Problem[] => {
    const at = positionOf(source);
    const offsetOf = (name: string): number =>
      pipe(
        Str.indexOf(name)(source),
        Option.getOrElse(() => START),
      );
    return pipe(
      patchedIn(source),
      Arr.filter((name) => ALCHEMY.test(name)),
      Arr.map((name) => problemOf(file, at(offsetOf(name)), name)),
    );
  };

/** @internal */
export const checkAlchemyPatch = Effect.fn("checkAlchemyPatch")(function* checkAlchemyPatch(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, WORKSPACE_FILE);
  const text = yield* files.readFile(file);
  return pipe(
    text,
    Option.map(problemsIn(file)),
    Option.getOrElse((): readonly Problem[] => []),
  );
});
