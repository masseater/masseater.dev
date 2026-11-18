import { Array as Arr, Option, String as Str, pipe } from "effect";

const BACKSLASH = "\\";
const CLOSING_REGEX = `${BACKSLASH}]/`;
const SLASH = "/";
const START = 0;
const NEXT = 1;
const DIGIT = /\d/u;
const REPEAT_END = /[\d,]/u;
const TRAILING_BACKSLASHES = /\\+$/u;
const FLAGS = ["u", ""];

const labelled = (line: string): string => {
  if (Str.includes(' label "')(line)) {
    return "runner-label";
  }
  return "expression";
};

const bracketed = (body: string): Option.Option<string> =>
  pipe(
    Str.lastIndexOf("[")(body),
    Option.map((open) => Str.replace(TRAILING_BACKSLASHES, "")(Str.slice(open + NEXT)(body))),
    Option.filter(Str.isNonEmpty),
  );

export const kindOf = (line: string): Option.Option<string> => {
  if (Str.endsWith(CLOSING_REGEX)(line)) {
    return bracketed(Str.slice(START, -CLOSING_REGEX.length)(line));
  }
  if (Str.startsWith(SLASH)(line)) {
    return Option.some(labelled(line));
  }
  if (Str.endsWith("]")(line)) {
    return bracketed(Str.slice(START, -NEXT)(line));
  }
  return Option.none();
};

export const isPorted =
  (ported: readonly string[]) =>
  (kind: string): boolean =>
    pipe(
      Str.replaceAll(/^\(|\)$/gu, "")(kind),
      Str.split("|"),
      Arr.some((each) => Arr.contains(ported, each)),
    );

const isRepetition = (char: string, previous: string, next: string): boolean =>
  (char === "{" && DIGIT.test(next)) || (char === "}" && REPEAT_END.test(previous));

const escapeAt =
  (chars: readonly string[]) =>
  (char: string, index: number): string => {
    const previous = pipe(
      Arr.get(chars, index - NEXT),
      Option.getOrElse(() => ""),
    );
    const next = pipe(
      Arr.get(chars, index + NEXT),
      Option.getOrElse(() => ""),
    );
    const brace = char === "{" || char === "}";
    if (brace && previous !== BACKSLASH && !isRepetition(char, previous, next)) {
      return `${BACKSLASH}${char}`;
    }
    return char;
  };

const goLiteralBraces = (source: string): string => {
  const chars = Str.split("")(source);
  return pipe(chars, Arr.map(escapeAt(chars)), Arr.join(""));
};

const attempt =
  (source: string) =>
  (flags: string): Option.Option<RegExp> => {
    try {
      return Option.some(new RegExp(source, flags));
    } catch {
      return Option.none();
    }
  };

const compile = (source: string): Option.Option<RegExp> =>
  pipe(
    [source, goLiteralBraces(source)],
    Arr.flatMap((candidate) => pipe(FLAGS, Arr.map(attempt(candidate)))),
    Arr.getSomes,
    Arr.head,
  );

const isPattern = (want: string): boolean =>
  want.length > NEXT && Str.startsWith(SLASH)(want) && Str.endsWith(SLASH)(want);

export const matches =
  (have: string) =>
  (want: string): boolean => {
    if (isPattern(want)) {
      return pipe(
        compile(Str.slice(NEXT, -NEXT)(want)),
        Option.exists((pattern) => pattern.test(have)),
      );
    }
    return want === have;
  };

export const sameLines =
  (have: readonly string[]) =>
  (want: readonly string[]): boolean =>
    want.length === have.length &&
    pipe(
      Arr.zip(want, have),
      Arr.every(([expected, actual]) => matches(actual)(expected)),
    );
