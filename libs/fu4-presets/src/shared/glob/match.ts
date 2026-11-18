import { Option, pipe } from "effect";

import { codePoints } from "#/shared/text/index.ts";

interface ClassMatch {
  readonly matched: boolean;
  readonly used: number;
}

interface Bounds {
  readonly low: string;
  readonly high: string;
  readonly end: number;
}

interface Cursor {
  readonly pattern: readonly string[];
  readonly name: readonly string[];
  readonly from: number;
  readonly at: number;
}

type Recurse = (cursor: Cursor) => boolean;

const NEXT = 1;
const SECOND = 2;
const START = 0;

const at = (chars: readonly string[], index: number): Option.Option<string> =>
  Option.fromNullishOr(chars[index]);

const literalAt = (
  pattern: readonly string[],
  index: number,
): Option.Option<readonly [string, number]> =>
  Option.flatMap(at(pattern, index), (char) => {
    if (char === "\\") {
      return Option.map(at(pattern, index + NEXT), (escaped) => [escaped, index + SECOND] as const);
    }
    return Option.some([char, index + NEXT] as const);
  });

const rangeAt = (
  pattern: readonly string[],
  low: string,
  index: number,
): Option.Option<readonly [string, number]> => {
  const isRange =
    Option.exists(at(pattern, index), (char) => char === "-") &&
    Option.exists(at(pattern, index + NEXT), (char) => char !== "]");
  if (!isRange) {
    return Option.some([low, index] as const);
  }
  return literalAt(pattern, index + NEXT);
};

const boundsAt = (pattern: readonly string[], index: number): Option.Option<Bounds> =>
  pipe(
    literalAt(pattern, index),
    Option.flatMap(([low, after]) =>
      Option.map(rangeAt(pattern, low, after), ([high, end]): Bounds => ({ low, high, end })),
    ),
  );

const scanClass = (
  pattern: readonly string[],
  char: string,
  start: number,
): Option.Option<ClassMatch> => {
  let index = start;
  let matched = false;
  for (let first = true; ; first = false) {
    if (Option.exists(at(pattern, index), (current) => current === "]") && !first) {
      return Option.some({ matched, used: index + NEXT });
    }
    const bounds = boundsAt(pattern, index);
    if (Option.isNone(bounds)) {
      return Option.none();
    }
    matched ||= bounds.value.low <= char && char <= bounds.value.high;
    index = bounds.value.end;
  }
};

const classMatches = (pattern: readonly string[], char: string): Option.Option<ClassMatch> => {
  const negated = Option.exists(at(pattern, START), (first) => first === "^");
  return Option.map(scanClass(pattern, char, Number(negated)), (found) => ({
    ...found,
    matched: found.matched !== negated,
  }));
};

const advanced = (cursor: Cursor, pattern: number, name: number): Cursor => ({
  ...cursor,
  from: cursor.from + pattern,
  at: cursor.at + name,
});

const star = (recurse: Recurse, cursor: Cursor): boolean => {
  for (let skip = cursor.at; skip <= cursor.name.length; skip += NEXT) {
    if (recurse({ ...cursor, from: cursor.from + NEXT, at: skip })) {
      return true;
    }
    if (cursor.name[skip] === "/") {
      return false;
    }
  }
  return false;
};

const bracket = (recurse: Recurse, cursor: Cursor, char: string): boolean =>
  char !== "/" &&
  Option.exists(
    classMatches(cursor.pattern.slice(cursor.from + NEXT), char),
    (found) => found.matched && recurse(advanced(cursor, NEXT + found.used, NEXT)),
  );

const escapedMatch = (recurse: Recurse, cursor: Cursor, char: string): boolean =>
  Option.exists(at(cursor.pattern, cursor.from + NEXT), (escaped) => escaped === char) &&
  recurse(advanced(cursor, SECOND, NEXT));

const single = (
  recurse: Recurse,
  cursor: Cursor,
  { head, char }: { readonly head: string; readonly char: string },
): boolean => {
  if (head === "?") {
    return char !== "/" && recurse(advanced(cursor, NEXT, NEXT));
  }
  if (head === "[") {
    return bracket(recurse, cursor, char);
  }
  if (head === "\\") {
    return escapedMatch(recurse, cursor, char);
  }
  return head === char && recurse(advanced(cursor, NEXT, NEXT));
};

const matchFrom: Recurse = (cursor) =>
  Option.match(at(cursor.pattern, cursor.from), {
    onNone: () => cursor.at === cursor.name.length,
    onSome: (head) => {
      if (head === "*") {
        return star(matchFrom, cursor);
      }
      return Option.exists(at(cursor.name, cursor.at), (char) =>
        single(matchFrom, cursor, { head, char }),
      );
    },
  });

export const pathMatch =
  (pattern: string) =>
  (name: string): boolean =>
    matchFrom({ pattern: codePoints(pattern), name: codePoints(name), from: START, at: START });
