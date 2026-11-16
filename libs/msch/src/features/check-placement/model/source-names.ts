import { Array as Arr, Option, Order, String as Str, pipe } from "effect";
import { Effect } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import englishVerbs from "./english-verbs.json" with { type: "json" };
import { memberSources } from "./member-sources.ts";

const SLICE_RULE: RuleName = "feature-slice-name";
const ENTRY_RULE: RuleName = "deploy-entry-name";
const FIRST = 1;
const SEPARATOR = "/";
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

const byLength = Order.mapInput(Order.Number, (directory: string) => directory.length);

const problemAt = (file: string, rule: RuleName, message: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule,
  message,
});

const innerOf =
  (workspaces: readonly string[]) =>
  (name: string): Option.Option<readonly [string, string]> =>
    pipe(
      workspaces,
      Arr.filter((workspace) => Str.startsWith(`${workspace}${SEPARATOR}`)(name)),
      (owners) => Arr.last(Arr.sort(owners, byLength)),
      Option.map(
        (workspace) => [workspace, Str.slice(workspace.length + SEPARATOR.length)(name)] as const,
      ),
    );

const isVerbObject = (slice: string): boolean => {
  const words = Str.split(slice, WORD_SEPARATOR);
  return words.length >= MINIMUM_WORDS && VERBS.has(words[0] ?? "");
};

const misnamedSlice = ([workspace, inner]: readonly [string, string]): Option.Option<string> =>
  pipe(
    Option.liftPredicate(inner, Str.startsWith(FEATURES)),
    Option.flatMap((path) => Arr.head(Str.split(Str.slice(FEATURES.length)(path), SEPARATOR))),
    Option.filter((slice) => !isVerbObject(slice)),
    Option.map((slice) => `${workspace}${SEPARATOR}${FEATURES}${slice}`),
  );

const deployNamed = ([workspace, inner]: readonly [string, string]): Option.Option<string> => {
  if (!Str.startsWith(SOURCE)(inner)) {
    return Option.none();
  }
  const segments = Str.split(inner, SEPARATOR);
  return pipe(
    Arr.findFirstIndex(segments, (segment) => DEPLOY_MARKER.test(segment)),
    Option.map(
      (index) =>
        `${workspace}${SEPARATOR}${Arr.join(Arr.take(segments, index + FIRST), SEPARATOR)}`,
    ),
  );
};

/** @internal */
export const checkSourceNames = Effect.fn("checkSourceNames")(function* checkSourceNames(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const { workspaces, listed } = yield* memberSources(root);
  const owned = pipe(listed, Arr.map(innerOf(workspaces)), Arr.getSomes);
  const report = (rule: RuleName, message: string) => (found: readonly string[]) =>
    pipe(
      Arr.dedupe(found),
      Arr.map((name) => problemAt(files.join(root, name), rule, message)),
    );
  return [
    ...report(SLICE_RULE, SLICE_MESSAGE)(pipe(owned, Arr.map(misnamedSlice), Arr.getSomes)),
    ...report(ENTRY_RULE, ENTRY_MESSAGE)(pipe(owned, Arr.map(deployNamed), Arr.getSomes)),
  ];
});
