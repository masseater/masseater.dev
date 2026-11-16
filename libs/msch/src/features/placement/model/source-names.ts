import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { MANIFEST_FILE } from "#/entities/package/index.ts";
import { workspaceDirectories } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const ALIAS_RULE: RuleName = "source-alias";
const RUNTIME_RULE: RuleName = "runtime-name";
const FIRST = 1;
const ROOT_WORKSPACE = ".";
const SEPARATOR = "/";
const SOURCE_ALIAS = "#/*";
const SOURCE_TARGET = "./src/*";
const SOURCE_PREFIX = /^\.\/src(?:\/|$)/u;
const RUNTIME_NAMES: readonly string[] = [
  "worker",
  "workers",
  "cloudflare",
  "durable-objects",
  "node",
  "nodejs",
  "bun",
  "deno",
  "browser",
  "tauri",
  "electron",
  "lambda",
  "vercel",
];
const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
  ":(exclude,attr:linguist-documentation)",
];

const ALIAS_MESSAGE = `points into src/ under its own name. Import source through "${SOURCE_ALIAS}": "${SOURCE_TARGET}" only, so an import names the layer and slice it uses instead of a folder alias.`;
const RUNTIME_MESSAGE =
  "names the runtime that runs the code. Name folders after what the code does: entry code goes in app/entrypoint/, and code that does not depend on the runtime moves to the slice or shared segment of its role.";

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

const RUNTIME_FOLDER = new RegExp(
  `^(?<folder>.*?/src(?:/[^/]+)*?/(?:${Arr.join(RUNTIME_NAMES, "|")}))/`,
  "u",
);

const runtimeFolderOf = (name: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(RUNTIME_FOLDER.exec(name)),
    Option.flatMap((found) => Option.fromUndefinedOr(found.groups)),
    Option.flatMap((groups) => Option.fromUndefinedOr(groups["folder"])),
  );

/** @internal */
export const checkSourceNames = Effect.fn("checkSourceNames")(function* checkSourceNames(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const declared = yield* workspaceDirectories(root);
  const workspaces = pipe(
    declared,
    Arr.filter((workspace) => workspace !== ROOT_WORKSPACE),
  );
  const listed = yield* files.matchingFiles(root, EXCLUDED);
  const folders = pipe(
    listed,
    Arr.filter((name) =>
      pipe(
        workspaces,
        Arr.some((workspace) => Str.startsWith(`${workspace}${SEPARATOR}src${SEPARATOR}`)(name)),
      ),
    ),
    Arr.map(runtimeFolderOf),
    Arr.getSomes,
    Arr.dedupe,
    Arr.map((folder) => problemAt(files.join(root, folder), RUNTIME_RULE, RUNTIME_MESSAGE)),
  );
  const aliases = yield* pipe(
    workspaces,
    Effect.forEach((workspace) => aliasProblems(root, workspace)),
  );
  return [...folders, ...Arr.flatten(aliases)];
});
