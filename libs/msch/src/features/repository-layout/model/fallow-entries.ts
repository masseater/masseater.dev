import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";
import { parse } from "vite-plus";

import {
  childrenOf,
  keyName,
  KeySchema,
  stringsIn,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "listed-entry";
const ENTRY_KEYS = ["entry", "entryPoints", "supportEntry"];
const FALLOW_CONFIG =
  /(?:^|\/)(?:\.fallowrc\.jsonc?|fallow-plugin-[^/]+\.jsonc?|\.fallow\/plugins\/[^/]+\.jsonc?)$/u;
const WILDCARD = /[*?{[]/u;
const SEPARATOR = "/";
const WRAP_OFFSET = 1;
const READ_CONCURRENCY = 8;
const decodeKey = Schema.decodeUnknownOption(KeySchema);

interface Pattern {
  readonly text: string;
  readonly start: number;
}

const isEntryProperty = (node: Readonly<Record<string, unknown>>): boolean =>
  node["type"] === "Property" &&
  pipe(
    decodeKey(node["key"]),
    Option.exists((key) => Arr.contains(ENTRY_KEYS, keyName(key))),
  );

const entryPatternsIn = (node: unknown): readonly Pattern[] => {
  if (Predicate.isReadonlyObject(node) && isEntryProperty(node)) {
    return pipe(
      stringsIn(node["value"]),
      Arr.map(({ text, start }) => ({ text, start: start - WRAP_OFFSET })),
    );
  }
  return pipe(childrenOf(node), Arr.flatMap(entryPatternsIn));
};

const namesOneFile =
  (directories: readonly string[]) =>
  ({ text }: Pattern): boolean =>
    pipe(
      directories,
      Arr.some((directory) => Str.startsWith(`${directory}${SEPARATOR}`)(text)),
    ) ||
    (Str.includes(SEPARATOR)(text) && !WILDCARD.test(text));

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(
  root: string,
  file: string,
  directories: readonly string[],
) {
  const files = yield* RepositoryFiles;
  const path = files.join(root, file);
  const text = yield* files.readFile(path);
  if (Option.isNone(text)) {
    return [];
  }
  const parsed = yield* Effect.promise(() =>
    parse(`${file}.ts`, `(${text.value})`, { lang: "ts" }),
  );
  return pipe(
    entryPatternsIn(parsed.program),
    Arr.filter(namesOneFile(directories)),
    Arr.map(({ text: pattern, start }): Problem => ({
      file: path,
      ...positionOf(text.value)(start),
      rule: RULE,
      message: `${pattern} names files one by one. Let fallow find the file through what declares it: package.json bin and exports, a tool's config file, or the main of the Alchemy resource that deploys it.`,
    })),
  );
});

/** @internal */
export const checkFallowEntries = Effect.fn("checkFallowEntries")(function* checkFallowEntries(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const directories = yield* workspaceDirectories(root);
  const found = yield* Effect.forEach(
    pipe(
      listed,
      Arr.filter((file) => FALLOW_CONFIG.test(file)),
    ),
    (file) => problemsIn(root, file, directories),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
