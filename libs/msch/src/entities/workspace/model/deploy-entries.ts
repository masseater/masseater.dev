import { Array as Arr, Effect, Option, Predicate, Schema, pipe } from "effect";
import { parse } from "vite-plus";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { KeySchema, childrenOf, keyName, stringsIn } from "./config-literal.ts";

const MAIN_KEY = "main";
const READ_CONCURRENCY = 16;
const SCRIPT = /\.[cm]?tsx?$/u;
const SKIPPED = /\.test\.|\.d\.[cm]?ts$/u;
const ALCHEMY_IMPORT = /from\s+["'](?:alchemy|@alchemy\.run)(?:\/[^"']*)?["']/u;
const MAIN_PROPERTY = /\bmain\s*:/u;
const decodeKey = Schema.decodeUnknownOption(KeySchema);

const isMainProperty = (node: Readonly<Record<string, unknown>>): boolean =>
  node["type"] === "Property" &&
  pipe(
    decodeKey(node["key"]),
    Option.exists((key) => keyName(key) === MAIN_KEY),
  );

const mainTargetsIn = (node: unknown): readonly string[] => {
  if (Predicate.isReadonlyObject(node) && isMainProperty(node)) {
    return pipe(
      stringsIn(node["value"]),
      Arr.head,
      Option.map(({ text }) => text),
      Option.toArray,
    );
  }
  return pipe(childrenOf(node), Arr.flatMap(mainTargetsIn));
};

const declaredIn = Effect.fn("declaredIn")(function* declaredIn(root: string, file: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, file));
  if (Option.isNone(text) || !ALCHEMY_IMPORT.test(text.value) || !MAIN_PROPERTY.test(text.value)) {
    return [];
  }
  const parsed = yield* Effect.promise(() => parse(file, text.value, { lang: "ts" }));
  return pipe(
    mainTargetsIn(parsed.program),
    Arr.map((target) => files.join(files.dirname(file), target)),
  );
});

export const deployEntries = Effect.fn("deployEntries")(function* deployEntries(root: string) {
  const files = yield* RepositoryFiles;
  const listed = yield* files.listedFiles(root);
  const declaring = pipe(
    listed,
    Arr.filter((file) => SCRIPT.test(file) && !SKIPPED.test(file)),
  );
  const found = yield* Effect.forEach(declaring, (file) => declaredIn(root, file), {
    concurrency: READ_CONCURRENCY,
  });
  return pipe(
    Arr.flatten(found),
    Arr.filter((file) => Arr.contains(listed, file)),
    Arr.dedupe,
  );
});
