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
const SLICE_DEPTH = 3;
const GROUPED_SLICE_DEPTH = 4;
const SLICE_DEPTHS: readonly number[] = [SLICE_DEPTH, GROUPED_SLICE_DEPTH];

const pathPrefix = (parts: readonly string[], depth: number): string =>
  Arr.join(Arr.take(parts, depth), SEPARATOR);

const isInSliceLayer = (parts: readonly string[]): boolean => {
  const [source, layer] = parts;
  return `${source}${SEPARATOR}` === SOURCE && Arr.contains(SLICE_LAYERS, layer ?? "");
};

const indexedSlice = (owned: Owned): Option.Option<string> => {
  const parts = Str.split(owned.inner, SEPARATOR);
  const depth = parts.length - NEXT;
  return pipe(
    Option.liftPredicate(
      depth,
      () => isInSliceLayer(parts) && INDEX.test(owned.inner) && Arr.contains(SLICE_DEPTHS, depth),
    ),
    Option.map(() => `${owned.workspace}${SEPARATOR}${pathPrefix(parts, depth)}`),
  );
};

const misnamedSegment =
  (slices: ReadonlySet<string>) =>
  ({ workspace, inner }: Owned): Option.Option<string> => {
    const parts = Str.split(inner, SEPARATOR);
    const insideSlice = (depth: number): boolean =>
      slices.has(`${workspace}${SEPARATOR}${pathPrefix(parts, depth)}`);
    const isSegmentFolder = (depth: number): boolean =>
      parts.length > depth + NEXT && SCRIPT.test(inner) && !SEGMENTS.has(parts[depth] ?? "");
    return pipe(
      SLICE_DEPTHS,
      Arr.findFirst(insideSlice),
      Option.filter(isSegmentFolder),
      Option.map((depth) => `${workspace}${SEPARATOR}${pathPrefix(parts, depth + NEXT)}`),
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
  const misnamedSlices = pipe(owned, Arr.map(misnamedSlice), Arr.getSomes);
  const misnamedSegments = pipe(owned, Arr.map(misnamedSegment(slices)), Arr.getSomes);
  const deployNames = pipe(owned, Arr.map(deployNamed), Arr.getSomes);
  return [
    ...report(SLICE_RULE, SLICE_MESSAGE)(misnamedSlices),
    ...report(SEGMENT_RULE, SEGMENT_MESSAGE)(misnamedSegments),
    ...report(ENTRY_RULE, ENTRY_MESSAGE)(deployNames),
  ];
});
