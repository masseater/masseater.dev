import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import englishVerbs from "./english-verbs.json" with { type: "json" };
import { fileProblem, memberSources, ownerOf } from "./member-sources.ts";
import type { Owned } from "./member-sources.ts";

const SLICE_RULE: RuleName = "feature-slice-name";
const ENTRY_RULE: RuleName = "deploy-entry-name";
const SEPARATOR = "/";
const NEXT = 1;
const WORD_SEPARATOR = "-";
const MINIMUM_WORDS = 2;
const FEATURES = "src/features/";
const SOURCE = "src/";
const DEPLOY_MARKER = /(?:^|[.-])entrypoints?(?=[.-]|$)|\.worker(?=\.)/iu;
const VERBS: ReadonlySet<string> = new Set(englishVerbs);

const SLICE_MESSAGE =
  "is not named <verb>-<object>. Name a feature slice after the one operation it performs, starting with an English verb (for example check-layout, sync-manuscripts).";
const ENTRY_MESSAGE =
  "is named after where it is deployed. Name it after what the code does; the Alchemy resource that deploys it decides which file is the entry.";

const isVerbObject = (slice: string): boolean => {
  const words = Str.split(slice, WORD_SEPARATOR);
  return words.length >= MINIMUM_WORDS && Option.exists(Arr.head(words), (word) => VERBS.has(word));
};

const misnamedSlice = ({ workspace, inner }: Owned): Option.Option<string> =>
  pipe(
    Option.liftPredicate(inner, Str.startsWith(FEATURES)),
    Option.flatMap((path) => Arr.head(Str.split(Str.slice(FEATURES.length)(path), SEPARATOR))),
    Option.filter((slice) => !isVerbObject(slice)),
    Option.map((slice) => `${workspace}${SEPARATOR}${FEATURES}${slice}`),
  );

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
  const report =
    (rule: RuleName, message: string) =>
    (found: readonly string[]): readonly Problem[] =>
      pipe(
        Arr.dedupe(found),
        Arr.map((name) => fileProblem(files.join(root, name), rule, message)),
      );
  return [
    ...report(SLICE_RULE, SLICE_MESSAGE)(pipe(owned, Arr.map(misnamedSlice), Arr.getSomes)),
    ...report(ENTRY_RULE, ENTRY_MESSAGE)(pipe(owned, Arr.map(deployNamed), Arr.getSomes)),
  ];
});
