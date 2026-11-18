import { Array as Arr, Option, String as Str, pipe } from "effect";

import popularActions from "#/shared/data/zizmor/popular-actions.json" with { type: "json" };
import popularPreCommit from "#/shared/data/zizmor/popular-pre-commit-repos.json" with { type: "json" };

const ALPHABET = Arr.fromIterable("abcdefghijklmnopqrstuvwxyz0123456789-_./");
const DELIMITERS = Arr.fromIterable("-_/");
const MAX_WORDS = 5;

const TYPOS: ReadonlyMap<string, readonly string[]> = new Map([
  ["1", ["2", "q", "i", "l"]],
  ["2", ["1", "q", "w", "3"]],
  ["3", ["2", "w", "e", "4"]],
  ["4", ["3", "e", "r", "5"]],
  ["5", ["4", "r", "t", "6", "s"]],
  ["6", ["5", "t", "y", "7"]],
  ["7", ["6", "y", "u", "8"]],
  ["8", ["7", "u", "i", "9"]],
  ["9", ["8", "i", "o", "0"]],
  ["0", ["9", "o", "p", "-"]],
  ["-", ["_", "0", "p", ".", ""]],
  ["_", ["-", "0", "p", ".", ""]],
  ["q", ["1", "2", "w", "a"]],
  ["w", ["2", "3", "e", "s", "a", "q", "vv"]],
  ["e", ["3", "4", "r", "d", "s", "w"]],
  ["r", ["4", "5", "t", "f", "d", "e"]],
  ["t", ["5", "6", "y", "g", "f", "r"]],
  ["y", ["6", "7", "u", "h", "t", "i"]],
  ["u", ["7", "8", "i", "j", "y", "v"]],
  ["i", ["1", "8", "9", "o", "l", "k", "j", "u", "y"]],
  ["o", ["9", "0", "p", "l", "i"]],
  ["p", ["0", "-", "o"]],
  ["a", ["q", "w", "s", "z"]],
  ["s", ["w", "d", "x", "z", "a", "5"]],
  ["d", ["e", "r", "f", "c", "x", "s"]],
  ["f", ["r", "g", "v", "c", "d"]],
  ["g", ["t", "h", "b", "v", "f"]],
  ["h", ["y", "j", "n", "b", "g"]],
  ["j", ["u", "i", "k", "m", "n", "h"]],
  ["k", ["i", "o", "l", "m", "j"]],
  ["l", ["i", "o", "p", "k", "1"]],
  ["z", ["a", "s", "x"]],
  ["x", ["z", "s", "d", "c"]],
  ["c", ["x", "d", "f", "v"]],
  ["v", ["c", "f", "g", "b", "u"]],
  ["b", ["v", "g", "h", "n"]],
  ["n", ["b", "h", "j", "m"]],
  ["m", ["n", "j", "k", "rn"]],
  [".", ["-", "_", ""]],
  ["/", ["-", "_"]],
]);

const NONE = 0;
const NEXT = 1;
const PAIR = 2;
const ASCII_LIMIT = 127;
const FIRST = 0;
const VERSION_SUFFIX = /[0-9]+$/u;
const DASH_SUFFIX = /-+$/u;
const WORD_DELIMITER = /[-_/]/u;

const isAscii = (char: string): boolean =>
  Option.exists(pipe(char, Str.codePointAt(FIRST)), (code) => code <= ASCII_LIMIT);

const charsOf = (text: string): readonly string[] => Arr.fromIterable(text);

const joined = (chars: readonly string[]): string => Arr.join(chars, "");

const ownerOf = (slug: string): string =>
  Option.getOrElse(Arr.head(Str.split("/")(slug)), () => slug);

const CORPUS: ReadonlyMap<string, string> = new Map(
  pipe(
    Arr.appendAll(popularActions, popularPreCommit),
    Arr.filter(Str.isNonEmpty),
    Arr.map((slug) => [Str.toLowerCase(slug), Str.toLowerCase(ownerOf(slug))] as const),
  ),
);

type Kind =
  | "omits characters in"
  | "repeats characters in"
  | "swaps characters in"
  | "swaps words in"
  | "uses a common typo for"
  | "only changes the version from";

const isKnownElsewhere =
  (owner: string) =>
  (candidate: string): boolean =>
    pipe(
      Option.fromNullishOr(CORPUS.get(candidate)),
      Option.exists((known) => known !== owner),
    );

const squatOf =
  (name: string, owner: string, kind: Kind) =>
  (candidate: string): Option.Option<string> =>
    Option.liftPredicate(
      `${kind} ${candidate}`,
      () => candidate !== name && isKnownElsewhere(owner)(candidate),
    );

const replaced =
  (chars: readonly string[], index: number, width: number) =>
  (inserted: readonly string[]): string =>
    joined(Arr.flatten([Arr.take(chars, index), inserted, Arr.drop(chars, index + width)]));

const adjacentPairs = (chars: readonly string[]): readonly (readonly [number, string, string])[] =>
  pipe(
    Arr.zip(chars, Arr.drop(chars, NEXT)),
    Arr.map(([left, right], index) => [index, left, right] as const),
  );

const repeated = (name: string): readonly string[] => {
  const chars = charsOf(name);
  return pipe(
    adjacentPairs(chars),
    Arr.filter(([, left, right]) => left === right && isAscii(left)),
    Arr.map(([index, left]) => replaced(chars, index, PAIR)([left])),
  );
};

const swappedCharacters = (name: string): readonly string[] => {
  const chars = charsOf(name);
  return pipe(
    adjacentPairs(chars),
    Arr.filter(([, left, right]) => left !== right),
    Arr.map(([index, left, right]) => replaced(chars, index, PAIR)([right, left])),
  );
};

const version = (name: string): readonly string[] => {
  const trimmed = pipe(name, Str.replace(VERSION_SUFFIX, ""), Str.replace(DASH_SUFFIX, ""));
  return Arr.filter([trimmed], (each) => Str.isNonEmpty(each) && each !== name);
};

const omitted = (name: string): readonly string[] => {
  const chars = charsOf(name);
  return pipe(
    Arr.range(NONE, chars.length),
    Arr.flatMap((index) =>
      pipe(
        ALPHABET,
        Arr.map((letter) => replaced(chars, index, NONE)([letter])),
      ),
    ),
  );
};

const without = <Value>(items: readonly Value[], index: number): readonly Value[] =>
  Arr.appendAll(Arr.take(items, index), Arr.drop(items, index + NEXT));

const permutations = <Value>(
  items: readonly Value[],
  size: number,
): readonly (readonly Value[])[] => {
  if (size === NONE) {
    return [[]];
  }
  return pipe(
    items,
    Arr.flatMap((item, index) =>
      pipe(
        permutations(without(items, index), size - NEXT),
        Arr.map((rest) => Arr.prepend(rest, item)),
      ),
    ),
  );
};

const swappedWords = (name: string): readonly string[] => {
  const tokens = Str.split(WORD_DELIMITER)(name);
  if (tokens.length === NEXT) {
    return [];
  }
  return pipe(
    permutations(tokens, Math.min(tokens.length, MAX_WORDS)),
    Arr.flatMap((words) =>
      pipe(
        DELIMITERS,
        Arr.map((delimiter) => Arr.join(words, delimiter)),
      ),
    ),
  );
};

const typosOf = (char: string): readonly string[] =>
  Option.getOrElse(Option.fromNullishOr(TYPOS.get(char)), (): readonly string[] => []);

const typos = (name: string): readonly string[] => {
  const chars = charsOf(name);
  return pipe(
    chars,
    Arr.flatMap((char, index) =>
      pipe(
        typosOf(char),
        Arr.map((typo) => replaced(chars, index, NEXT)([typo])),
      ),
    ),
  );
};

const CHECKS: readonly (readonly [Kind, (name: string) => readonly string[]])[] = [
  ["repeats characters in", repeated],
  ["swaps characters in", swappedCharacters],
  ["only changes the version from", version],
  ["omits characters in", omitted],
  ["swaps words in", swappedWords],
  ["uses a common typo for", typos],
];

const squats = new Map<string, Option.Option<string>>();

const searched = (name: string, owner: string): Option.Option<string> => {
  if (CORPUS.has(name)) {
    return Option.none();
  }
  return pipe(
    CHECKS,
    Arr.findFirst(([kind, candidates]) =>
      pipe(candidates(name), Arr.findFirst(squatOf(name, owner, kind))),
    ),
  );
};

export const firstSquat =
  (name: string) =>
  (owner: string): Option.Option<string> => {
    const key = `${owner}/${name}`;
    return Option.getOrElse(Option.fromNullishOr(squats.get(key)), () => {
      const found = searched(name, owner);
      squats.set(key, found);
      return found;
    });
  };
