import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import englishVerbs from "./english-verbs.json" with { type: "json" };
import { fileProblem, memberSources, ownerOf } from "./member-sources.ts";
import type { Owned } from "./member-sources.ts";

const SLICE_RULE: RuleName = "feature-slice-name";
const ENTRY_RULE: RuleName = "deploy-entry-name";
const SEGMENT_RULE: RuleName = "slice-segment-name";
const SEPARATOR = "/";
const NEXT = 1;
const WORD_SEPARATOR = "-";
const MINIMUM_WORDS = 2;
const FEATURES = "src/features/";
const SOURCE = "src/";
const SEGMENTS: ReadonlySet<string> = new Set(["ui", "model", "api", "lib", "config", "@x"]);
const DEPLOY_MARKER = /(?:^|[.-])entrypoints?(?=[.-]|$)|\.worker(?=\.)/iu;
const INDEX = /\/index(?:\.[a-z]+)*\.[cm]?[jt]sx?$/u;
const SCRIPT = /\.[cm]?[jt]sx?$/u;
const VERBS: ReadonlySet<string> = new Set(englishVerbs);

const SLICE_MESSAGE =
  "is not named <verb>-<object>. Name a feature slice after the one operation it performs, starting with an English verb (for example check-layout, sync-manuscripts).";
const SEGMENT_MESSAGE =
  "is a folder in a slice that is not one of the segments ui, model, api, lib or config. Name the segment after its purpose and put the code in one of them; a segment that grows holds folders of its own.";
const ENTRY_MESSAGE =
  "is named after where it is deployed. Name it after what the code does; the Alchemy resource that deploys it decides which file is the entry.";

export const isVerbObjectBy =
  (separator: string) =>
  (slice: string): boolean => {
    const words = Str.split(slice, separator);
    return (
      words.length >= MINIMUM_WORDS && Option.exists(Arr.head(words), (word) => VERBS.has(word))
    );
  };

const isVerbObject = isVerbObjectBy(WORD_SEPARATOR);

const misnamedSlice = ({ workspace, inner }: Owned): Option.Option<string> =>
  pipe(
    Option.liftPredicate(inner, (path) => Str.startsWith(FEATURES)(path) && SCRIPT.test(path)),
    Option.flatMap((path) => Arr.head(Str.split(Str.slice(FEATURES.length)(path), SEPARATOR))),
    Option.filter((slice) => !isVerbObject(slice)),
    Option.map((slice) => `${workspace}${SEPARATOR}${FEATURES}${slice}`),
  );

const SLICE_LAYERS: readonly string[] = ["features", "entities", "widgets", "pages"];
const sliceDepths: readonly number[] = [3, 4];

const pathPrefix = (parts: readonly string[], depth: number): string =>
  Arr.join(Arr.take(parts, depth), SEPARATOR);

const indexedSlice = (owned: Owned): Option.Option<string> =>
  pipe(
    Str.split(owned.inner, SEPARATOR),
    Option.liftPredicate(
      ([source, layer, ...rest]) =>
        `${source}${SEPARATOR}` === SOURCE &&
        Arr.contains(SLICE_LAYERS, layer ?? "") &&
        INDEX.test(owned.inner) &&
        Arr.contains(sliceDepths, rest.length + 2),
    ),
    Option.map((parts) => `${owned.workspace}${SEPARATOR}${pathPrefix(parts, parts.length - 1)}`),
  );

const misnamedSegment =
  (slices: ReadonlySet<string>) =>
  ({ workspace, inner }: Owned): Option.Option<string> => {
    const parts = Str.split(inner, SEPARATOR);
    return pipe(
      sliceDepths,
      Arr.findFirst((depth) => slices.has(`${workspace}${SEPARATOR}${pathPrefix(parts, depth)}`)),
      Option.filter((depth) => parts.length > depth + 1 && SCRIPT.test(inner)),
      Option.filter((depth) => !SEGMENTS.has(parts[depth] ?? "")),
      Option.map((depth) => `${workspace}${SEPARATOR}${pathPrefix(parts, depth + 1)}`),
    );
  };

const deployNamed = ({ workspace, inner }: Owned): Option.Option<string> => {
  if (!Str.startsWith(SOURCE)(inner)) {
    return Option.none();
  }
  const segments = Str.split(inner, SEPARATOR);
  return pipe(
    Arr.findFirstIndex(segments, (segment) => DEPLOY_MARKER.test(segment)),
    Option.map(
      (index) => `${workspace}${SEPARATOR}${Arr.join(Arr.take(segments, index + NEXT), SEPARATOR)}`,
    ),
  );
};

/** @internal */
export const checkSourceNames = Effect.fn("checkSourceNames")(function* checkSourceNames(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const { workspaces, listed } = yield* memberSources(root);
  const owned = pipe(listed, Arr.map(ownerOf(workspaces)), Arr.getSomes);
  const slices: ReadonlySet<string> = new Set(pipe(owned, Arr.map(indexedSlice), Arr.getSomes));
  const report =
    (rule: RuleName, message: string) =>
    (found: readonly string[]): readonly Problem[] =>
      pipe(
        Arr.dedupe(found),
        Arr.map((name) => fileProblem({ file: files.join(root, name), rule, message })),
      );
  return [
    ...report(SLICE_RULE, SLICE_MESSAGE)(pipe(owned, Arr.map(misnamedSlice), Arr.getSomes)),
    ...report(
      SEGMENT_RULE,
      SEGMENT_MESSAGE,
    )(pipe(owned, Arr.map(misnamedSegment(slices)), Arr.getSomes)),
    ...report(ENTRY_RULE, ENTRY_MESSAGE)(pipe(owned, Arr.map(deployNamed), Arr.getSomes)),
  ];
});
