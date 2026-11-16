import { Array as Arr, Effect, Option, Predicate, Schema, String as Str, pipe } from "effect";
import { parse } from "vite-plus";

import {
  childrenOf,
  deployEntries,
  keyName,
  KeySchema,
  stringsIn,
  workspaceDirectories,
} from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "deploy-entry-pattern";
const FALLOW_KEYS = ["entry", "entryPoints", "supportEntry", "dynamicallyLoaded", "alwaysUsed"];
const VITE_KEYS = ["files"];
const FALLOW_CONFIG = /(?:^|\/)(?:\.fallowrc\.jsonc?|fallow-plugin-[^/]+\.jsonc?)$/u;
const VITE_CONFIG = /(?:^|\/)vite\.config\.[cm]?ts$/u;
const BRACE_GROUP = /\{(?<options>[^{}]*)\}/u;
const OPTION_SEPARATOR = ",";
const PAIR = 2;
const NEGATED = "!";
const ROOT_WORKSPACE = ".";
const WRAP_OFFSET = 1;
const NO_OFFSET = 0;
const READ_CONCURRENCY = 8;
const MESSAGE =
  "selects deploy entries by their name or location. A deploy entry is the file that an Alchemy resource names in main, and its name and place change with the code. Use workspaceSettings().lint.deployEntries in lint settings; fallow reads main from the stack by itself.";
const decodeKey = Schema.decodeUnknownOption(KeySchema);

interface Pattern {
  readonly text: string;
  readonly start: number;
}

interface ConfigKind {
  readonly keys: readonly string[];
  readonly offset: number;
  readonly sourceOf: (text: string) => string;
  readonly bases: (directory: string, workspaces: readonly string[]) => readonly string[];
}

const FALLOW: ConfigKind = {
  keys: FALLOW_KEYS,
  offset: WRAP_OFFSET,
  sourceOf: (text) => `(${text})`,
  bases: (directory, workspaces) => [directory, ...workspaces],
};

const VITE: ConfigKind = {
  keys: VITE_KEYS,
  offset: NO_OFFSET,
  sourceOf: (text) => text,
  bases: (directory) => [directory],
};

const isPatternProperty =
  (keys: readonly string[]) =>
  (node: Readonly<Record<string, unknown>>): boolean =>
    node["type"] === "Property" &&
    pipe(
      decodeKey(node["key"]),
      Option.exists((key) => Arr.contains(keys, keyName(key))),
    );

const patternsIn =
  (keys: readonly string[]) =>
  (node: unknown): readonly Pattern[] => {
    if (Predicate.isReadonlyObject(node) && isPatternProperty(keys)(node)) {
      return stringsIn(node["value"]);
    }
    return pipe(childrenOf(node), Arr.flatMap(patternsIn(keys)));
  };

const choicesOf = ([literal = "", options]: readonly string[]): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(options),
    Option.map(Str.split(OPTION_SEPARATOR)),
    Option.getOrElse((): readonly string[] => [""]),
    Arr.map((option) => `${literal}${option}`),
  );

const combined = (chunks: readonly (readonly string[])[]): readonly string[] =>
  Arr.matchLeft(chunks, {
    onEmpty: (): readonly string[] => [""],
    onNonEmpty: (head, tail) =>
      pipe(
        choicesOf(head),
        Arr.flatMap((choice) =>
          pipe(
            combined(tail),
            Arr.map((rest) => `${choice}${rest}`),
          ),
        ),
      ),
  });

const expanded = (pattern: string): readonly string[] =>
  combined(Arr.chunksOf(Str.split(pattern, BRACE_GROUP), PAIR));

interface Selection {
  readonly root: string;
  readonly bases: readonly string[];
  readonly entries: readonly string[];
}

const selectsOnlyDeployEntries = Effect.fn("selectsOnlyDeployEntries")(
  function* selectsOnlyDeployEntries({ root, bases, entries }: Selection, pattern: Pattern) {
    const files = yield* RepositoryFiles;
    const pathspecs = pipe(
      bases,
      Arr.flatMap((base) =>
        pipe(
          expanded(pattern.text),
          Arr.map((spec) => `:(glob)${files.join(base, spec)}`),
        ),
      ),
    );
    const matched = yield* files.matchingFiles(root, pathspecs);
    const selects =
      Arr.isReadonlyArrayNonEmpty(matched) &&
      pipe(
        matched,
        Arr.every((file) => Arr.contains(entries, file)),
      );
    return Option.liftPredicate(pattern, () => selects);
  },
);

interface ConfigRequest {
  readonly root: string;
  readonly file: string;
  readonly kind: ConfigKind;
  readonly workspaces: readonly string[];
  readonly entries: readonly string[];
}

const patternsOf = Effect.fn("patternsOf")(function* patternsOf(
  file: string,
  text: string,
  kind: ConfigKind,
) {
  const parsed = yield* Effect.promise(() =>
    parse(`${file}.ts`, kind.sourceOf(text), { lang: "ts" }),
  );
  return pipe(
    patternsIn(kind.keys)(parsed.program),
    Arr.filter(({ text: pattern }) => !Str.startsWith(NEGATED)(pattern)),
  );
});

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(request: ConfigRequest) {
  const { root, file, kind, workspaces, entries } = request;
  const files = yield* RepositoryFiles;
  const path = files.join(root, file);
  const text = yield* files.readFile(path);
  if (Option.isNone(text)) {
    return [];
  }
  const patterns = yield* patternsOf(file, text.value, kind);
  const selection = { root, bases: kind.bases(files.dirname(file), workspaces), entries };
  const flagged = yield* pipe(
    patterns,
    Effect.forEach((pattern) => selectsOnlyDeployEntries(selection, pattern)),
  );
  return pipe(
    Arr.getSomes(flagged),
    Arr.map(({ text: pattern, start }): Problem => ({
      file: path,
      ...positionOf(text.value)(start - kind.offset),
      rule: RULE,
      message: `${pattern} ${MESSAGE}`,
    })),
  );
});

/** @internal */
export const checkDeployEntryPatterns = Effect.fn("checkDeployEntryPatterns")(
  function* checkDeployEntryPatterns(root: string) {
    const files = yield* RepositoryFiles;
    const entries = yield* deployEntries(root);
    if (!Arr.isReadonlyArrayNonEmpty(entries)) {
      return [];
    }
    const listed = yield* files.listedFiles(root);
    const declared = yield* workspaceDirectories(root);
    const workspaces = pipe(
      declared,
      Arr.filter((workspace) => workspace !== ROOT_WORKSPACE),
    );
    const configs = pipe(
      listed,
      Arr.flatMap((file) => {
        if (FALLOW_CONFIG.test(file)) {
          return [{ file, kind: FALLOW }];
        }
        if (VITE_CONFIG.test(file)) {
          return [{ file, kind: VITE }];
        }
        return [];
      }),
    );
    const found = yield* Effect.forEach(
      configs,
      ({ file, kind }) => problemsIn({ root, file, kind, workspaces, entries }),
      { concurrency: READ_CONCURRENCY },
    );
    return Arr.flatten(found);
  },
);
