import { Option, String as Str, pipe } from "effect";

import { quoteChar } from "#/shared/text/index.ts";

import { unexpected } from "./messages.ts";
import type { Glob } from "./scanner.ts";

const SINGLE = 1;
const RANGE = 2;
const FIRST = 0;
const RANGE_PLACE = "character range in []";

export type ClassEnd = Option.Option<Option.Option<string>>;

const is = (char: Option.Option<string>, expected: string): boolean =>
  Option.exists(char, (found) => found === expected);

const codeOf = (char: string): number =>
  Option.getOrElse(Str.codePointAt(FIRST)(char), () => FIRST);

const reversed = (glob: Glob, start: string, end: Option.Option<string>): Option.Option<string> => {
  const larger = pipe(
    end,
    Option.filter((each) => codeOf(start) > codeOf(each)),
  );
  for (const found of Option.toArray(larger)) {
    unexpected(glob)(
      end,
      RANGE_PLACE,
      `start of range ${quoteChar(start)} (${String(codeOf(start))}) is larger than end of range ${quoteChar(found)} (${String(codeOf(found))})`,
    );
  }
  return end;
};

const rangeEnd = (glob: Glob, start: string): Option.Option<string> => {
  glob.next();
  if (is(glob.peek(), "]")) {
    const char = glob.next();
    unexpected(glob)(char, RANGE_PLACE, "end of range is missing");
    return char;
  }
  if (Option.isNone(glob.peek())) {
    return Option.none();
  }
  return reversed(glob, start, glob.next());
};

interface Member {
  readonly last: Option.Option<string>;
  readonly count: number;
  readonly done: boolean;
}

const member = (glob: Glob): Option.Option<Member> => {
  const char = glob.next();
  if (Option.isNone(char)) {
    unexpected(glob)(Option.none(), "end of character match []", "missing ]");
    return Option.none();
  }
  if (char.value === "]") {
    return Option.some({ last: char, count: FIRST, done: true });
  }
  if (!is(glob.peek(), "-")) {
    return Option.some({ last: char, count: SINGLE, done: false });
  }
  const last = rangeEnd(glob, char.value);
  return Option.some({ last, count: RANGE, done: is(last, "]") });
};

const members = (glob: Glob): ClassEnd => {
  let count = FIRST;
  for (;;) {
    const found = member(glob);
    if (Option.isNone(found)) {
      return Option.none();
    }
    count += found.value.count;
    if (found.value.done) {
      if (count === SINGLE) {
        unexpected(glob)(
          found.value.last,
          "character match []",
          "character match with single character is useless. simply use x instead of [x]",
        );
      }
      return Option.some(found.value.last);
    }
  }
};

export const validateClass = (glob: Glob): ClassEnd => {
  if (is(glob.peek(), "]")) {
    const char = glob.next();
    unexpected(glob)(char, "content of character match []", "character match must not be empty");
    return Option.some(char);
  }
  return members(glob);
};
