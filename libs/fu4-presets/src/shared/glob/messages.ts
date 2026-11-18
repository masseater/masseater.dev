import { Option, String as Str, pipe } from "effect";

import { quoteChar } from "#/shared/text/index.ts";

import { describeChar, isPrint } from "./scanner.ts";
import type { Glob } from "./scanner.ts";

const duringOf = (what: string): string => {
  if (Str.isEmpty(what)) {
    return "";
  }
  return ` while checking ${what}`;
};

export const unexpected =
  (glob: Glob) =>
  (char: Option.Option<string>, what: string, why: string): void => {
    const found = Option.match(char, {
      onNone: () => "unexpected EOF",
      onSome: (each) => `unexpected character ${quoteChar(each)}`,
    });
    glob.fail(`invalid glob pattern. ${found}${duringOf(what)}. ${why}`);
  };

export const invalidRefChar =
  (glob: Glob) =>
  (char: Option.Option<string>, why: string): void => {
    const shown = Option.match(pipe(char, Option.filter(isPrint)), {
      onNone: () => describeChar(char),
      onSome: (each) => `'${each}'`,
    });
    glob.fail(
      `character ${shown} is invalid for branch and tag names. ${why}. see \`man git-check-ref-format\` for more details. note that regular expression is unavailable`,
    );
  };
