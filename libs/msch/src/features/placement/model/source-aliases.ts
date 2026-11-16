import { Array as Arr, Effect, Option, Predicate, Record as Rec, Schema, pipe } from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { memberWorkspaces } from "./member-sources.ts";

const ALIAS_RULE: RuleName = "source-alias";
const FIRST = 1;
const SOURCE_ALIAS = "#/*";
const SOURCE_TARGET = "./src/*";
const SOURCE_PREFIX = /^\.\/src(?:\/|$)/u;

const ALIAS_MESSAGE = `points into src/ under its own name. Import source through "${SOURCE_ALIAS}": "${SOURCE_TARGET}" only, so an import names the layer and slice it uses instead of a folder alias.`;

const Manifest = Schema.Struct({ imports: Schema.optional(Schema.Unknown) });
const decodeManifest = Schema.decodeUnknownOption(Schema.fromJsonString(Manifest));

const problemAt = (file: string, rule: RuleName, message: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule,
  message,
});

const targetsOf = (target: unknown): readonly string[] => {
  if (Predicate.isString(target)) {
    return [target];
  }
  if (Predicate.isObject(target)) {
    return pipe(Rec.values(target), Arr.flatMap(targetsOf));
  }
  return [];
};

const intoSource = ([key, target]: readonly [string, unknown]): boolean =>
  !(
    key === SOURCE_ALIAS &&
    pipe(
      targetsOf(target),
      Arr.every((path) => path === SOURCE_TARGET),
    )
  ) &&
  pipe(
    targetsOf(target),
    Arr.some((path) => SOURCE_PREFIX.test(path)),
  );

const aliasProblems = Effect.fn("aliasProblems")(function* aliasProblems(
  root: string,
  workspace: string,
) {
  const files = yield* RepositoryFiles;
  const manifest = files.join(root, workspace, MANIFEST_FILE);
  const text = yield* files.readFile(manifest);
  return pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.flatMap(({ imports }) => Option.liftPredicate(imports, Predicate.isObject)),
    Option.map((imports): readonly (readonly [string, unknown])[] => Rec.toEntries(imports)),
    Option.getOrElse((): readonly (readonly [string, unknown])[] => Arr.empty()),
    Arr.filter(intoSource),
    Arr.map(([key]) => problemAt(manifest, ALIAS_RULE, `"${key}" ${ALIAS_MESSAGE}`)),
  );
});

/** @internal */
export const checkSourceAliases = Effect.fn("checkSourceAliases")(function* checkSourceAliases(
  root: string,
) {
  const workspaces = yield* memberWorkspaces(root);
  const aliases = yield* pipe(
    workspaces,
    Effect.forEach((workspace) => aliasProblems(root, workspace)),
  );
  return Arr.flatten(aliases);
});
