import {
  Array as Arr,
  Option,
  Predicate,
  Record as Rec,
  pipe,
  String as Str,
  Function as Fn,
} from "effect";

import { tryGetExtensionFromPath } from "./extensions.ts";
import type { Extensions } from "./extensions.ts";
import { Messages, traceMessage } from "./messages.ts";
import { combinePaths, getDirectoryPath, normalizePath } from "./paths.ts";
import type { CandidateRequest, PathAndExtension, ResolutionState } from "./resolution-types.ts";
import { tryFile } from "./resolver-files.ts";

const DATA_FIRST_ARITY = 2;

type Loader<Found = PathAndExtension> = (
  request: CandidateRequest,
  state: ResolutionState,
) => Option.Option<Found>;

interface PathsRequest<Found> {
  readonly extensions: Extensions;
  readonly moduleName: string;
  readonly baseDirectory: string;
  readonly paths: Readonly<Record<string, unknown>>;
  readonly loader: Loader<Found>;
  readonly onlyRecordFailures: boolean;
  readonly fromFile: (file: PathAndExtension) => Found;
}

interface Pattern {
  readonly prefix: string;
  readonly suffix: string;
}

type PatternOrExact =
  | { readonly kind: "exact"; readonly text: string }
  | { readonly kind: "pattern"; readonly pattern: Pattern };

const STAR_LENGTH = 1;
const START = 0;

const patternAt = (key: string, star: number): Option.Option<PatternOrExact> =>
  Option.liftPredicate(key, (text) => !Str.includes("*", star + STAR_LENGTH)(text)).pipe(
    Option.map((text) => ({
      kind: "pattern",
      pattern: {
        prefix: Str.slice(START, star)(text),
        suffix: Str.slice(star + STAR_LENGTH)(text),
      },
    })),
  );

const tryParsePattern = (key: string): Option.Option<PatternOrExact> =>
  Option.match(Str.indexOf("*")(key), {
    onNone: () => Option.some({ kind: "exact", text: key }),
    onSome: (star) => patternAt(key, star),
  });

const isPatternMatch = ({ prefix, suffix }: Pattern, candidate: string): boolean =>
  candidate.length >= prefix.length + suffix.length &&
  Str.startsWith(prefix)(candidate) &&
  Str.endsWith(suffix)(candidate);

const bestPattern = (patterns: readonly Pattern[], candidate: string): Option.Option<Pattern> =>
  Arr.reduce(patterns, Option.none<Pattern>(), (best, pattern) =>
    Option.liftPredicate(
      pattern,
      (current) =>
        isPatternMatch(current, candidate) &&
        Option.match(best, {
          onNone: () => true,
          onSome: (previous) => current.prefix.length > previous.prefix.length,
        }),
    ).pipe(Option.orElse(() => best)),
  );

const patternOf = (entry: PatternOrExact): Option.Option<Pattern> => {
  if (entry.kind === "pattern") {
    return Option.some(entry.pattern);
  }
  return Option.none();
};

interface MatchedPattern {
  readonly text: string;
  readonly star: string;
}

const matchedBy =
  (candidate: string) =>
  (pattern: Pattern): MatchedPattern => ({
    text: `${pattern.prefix}*${pattern.suffix}`,
    star: Str.slice(pattern.prefix.length, candidate.length - pattern.suffix.length)(candidate),
  });

const patternMatch = (
  entries: readonly PatternOrExact[],
  candidate: string,
): Option.Option<MatchedPattern> => {
  const patterns = pipe(
    entries,
    Arr.map((entry) => patternOf(entry)),
    Arr.getSomes,
  );
  return Option.map(bestPattern(patterns, candidate), matchedBy(candidate));
};

const matchPatternOrExact = (
  entries: readonly PatternOrExact[],
  candidate: string,
): Option.Option<MatchedPattern> =>
  pipe(
    entries,
    Arr.findFirst((entry) => entry.kind === "exact" && entry.text === candidate),
    Option.map((): MatchedPattern => ({ text: candidate, star: "" })),
    Option.orElse(() => patternMatch(entries, candidate)),
  );

const substitutionsOf = (
  paths: Readonly<Record<string, unknown>>,
  key: string,
): readonly string[] =>
  Option.fromNullishOr(paths[key]).pipe(
    Option.filter((value) => Arr.isArray(value)),
    Option.map((values: readonly unknown[]) =>
      pipe(
        values,
        Arr.filter((value): value is string => Predicate.isString(value)),
      ),
    ),
    Option.getOrElse((): readonly string[] => []),
  );

interface Substitution {
  readonly text: string;
  readonly matched: MatchedPattern;
}

const trySubstitution = <Found>(
  { text, matched }: Substitution,
  context: PathsRequest<Found>,
  state: ResolutionState,
): Option.Option<Found> => {
  const path = Option.liftPredicate(matched.star, (star) => star.length > START).pipe(
    Option.match({ onNone: () => text, onSome: (star) => Str.replace("*", star)(text) }),
  );
  const candidate = normalizePath(combinePaths(context.baseDirectory, path));
  traceMessage(state, Messages.tryingSubstitution, text, path);
  return tryGetExtensionFromPath(text).pipe(
    Option.flatMap((extension) =>
      tryFile(candidate, context.onlyRecordFailures, state).pipe(
        Option.map((found) =>
          context.fromFile({ path: found, extension, resolvedUsingTsExtension: false }),
        ),
      ),
    ),
    Option.orElse(() =>
      context.loader(
        {
          extensions: context.extensions,
          candidate,
          onlyRecordFailures:
            context.onlyRecordFailures || !state.host.directoryExists(getDirectoryPath(candidate)),
        },
        state,
      ),
    ),
  );
};

const tryLoadModuleUsingPaths: {
  (
    state: ResolutionState,
  ): <Found>(context: PathsRequest<Found>) => Option.Option<Option.Option<Found>>;
  <Found>(
    context: PathsRequest<Found>,
    state: ResolutionState,
  ): Option.Option<Option.Option<Found>>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  <Found>(
    context: PathsRequest<Found>,
    state: ResolutionState,
  ): Option.Option<Option.Option<Found>> => {
    const entries = Arr.getSomes(
      pipe(
        Rec.keys(context.paths),
        Arr.map((key) => tryParsePattern(key)),
      ),
    );
    return matchPatternOrExact(entries, context.moduleName).pipe(
      Option.map((matched) => {
        traceMessage(state, Messages.matchedPattern, context.moduleName, matched.text);
        return pipe(
          substitutionsOf(context.paths, matched.text),
          Arr.findFirst((text) => trySubstitution({ text, matched }, context, state)),
        );
      }),
    );
  },
);

export { tryLoadModuleUsingPaths };
export type { Loader, PathsRequest };
