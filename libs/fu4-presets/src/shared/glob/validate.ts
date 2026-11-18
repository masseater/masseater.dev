import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { validateClass } from "./class.ts";
import { invalidRefChar, unexpected } from "./messages.ts";
import { globOf } from "./scanner.ts";
import type { Glob, InvalidGlob } from "./scanner.ts";

const RANGE_REASON = "ref name cannot contain spaces, ~, ^, :, [, ?, *";
const SPECIAL_REASON = "the preceding character must not be special character";
const NEWLINE_REASON = "newline cannot be contained";
const REF_INVALID: readonly string[] = [" ", "\t", "~", "^", ":"];
const ESCAPABLE: readonly string[] = ["[", "?", "*"];
const SELF_ESCAPED: readonly string[] = ["+", "\\", "!"];
const ENDINGS: readonly string[] = ["/", "."];
const PATH_ERRORS = {
  spaces: "leading and trailing spaces are not allowed in glob path",
  relative: "'.' and '..' are not allowed in glob path",
};
const START = 0;

const is = (char: Option.Option<string>, expected: string): boolean =>
  Option.exists(char, (found) => found === expected);
const within = (char: Option.Option<string>, set: readonly string[]): boolean =>
  Option.exists(char, (found) => Arr.contains(set, found));

const escapedSpecial = (glob: Glob): Option.Option<string> => {
  const char = glob.next();
  if (glob.isRef) {
    invalidRefChar(glob)(glob.peek(), RANGE_REASON);
  }
  return char;
};

const escaped = (glob: Glob, backslash: Option.Option<string>): Option.Option<string> => {
  if (within(glob.peek(), ESCAPABLE)) {
    return escapedSpecial(glob);
  }
  if (within(glob.peek(), SELF_ESCAPED)) {
    return glob.next();
  }
  if (!glob.isRef) {
    return backslash;
  }
  invalidRefChar(glob)(
    backslash,
    "only special characters [, ?, +, *, \\, ! can be escaped with \\",
  );
  return glob.next();
};

const repeat = (glob: Glob, char: string, what: string): Option.Option<string> => {
  if (!glob.prec()) {
    unexpected(glob)(Option.some(char), what, SPECIAL_REASON);
  }
  return Option.some(char);
};

const carriage = (glob: Glob, char: Option.Option<string>): Option.Option<string> => {
  const last = pipe(
    glob.peek(),
    Option.filter((found) => found === "\n"),
    Option.match({ onNone: () => char, onSome: () => glob.next() }),
  );
  unexpected(glob)(last, "", NEWLINE_REASON);
  return last;
};

const HANDLERS: Readonly<
  Record<string, (glob: Glob, char: Option.Option<string>) => Option.Option<Option.Option<string>>>
> = {
  "\\": (glob, char) => Option.some(escaped(glob, char)),
  "?": (glob) => Option.some(repeat(glob, "?", "special character ? (zero or one)")),
  "+": (glob) => Option.some(repeat(glob, "+", "special character + (one or more)")),
  "*": (_glob, char) => Option.some(char),
  "[": (glob) => validateClass(glob),
  "\r": (glob, char) => Option.some(carriage(glob, char)),
  "\n": (glob, char) => {
    unexpected(glob)(char, "", NEWLINE_REASON);
    return Option.some(char);
  },
};

const NON_PRECEDING: readonly string[] = ["?", "+", "*"];

const step = (glob: Glob, char: Option.Option<string>): Option.Option<Option.Option<string>> => {
  const handler = pipe(
    char,
    Option.flatMap((found) => Rec.get(HANDLERS, found)),
  );
  if (Option.isSome(handler)) {
    return handler.value(glob, char);
  }
  if (glob.isRef && within(char, REF_INVALID)) {
    invalidRefChar(glob)(char, RANGE_REASON);
  }
  return Option.some(char);
};

const validateNext = (glob: Glob): boolean => {
  const char = glob.next();
  const last = step(glob, char);
  if (Option.isNone(last)) {
    return false;
  }
  glob.setPrec(!within(char, NON_PRECEDING));
  if (Option.isSome(glob.peek())) {
    return true;
  }
  if (glob.isRef && within(last.value, ENDINGS)) {
    invalidRefChar(glob)(last.value, "ref name must not end with / and .");
  }
  return false;
};

const negated = (glob: Glob): boolean => {
  glob.next();
  if (Option.isNone(glob.peek())) {
    unexpected(glob)(
      Option.some("!"),
      "! at first character (negate pattern)",
      "at least one character must follow !",
    );
    return false;
  }
  glob.setPrec(false);
  return true;
};

const validateStart = (glob: Glob): boolean => {
  if (glob.isRef && is(glob.peek(), "/")) {
    glob.next();
    invalidRefChar(glob)(Option.some("/"), "ref name must not start with /");
    glob.setPrec(true);
    return true;
  }
  if (!is(glob.peek(), "!")) {
    return true;
  }
  return negated(glob);
};

const validate = (pattern: string, isRef: boolean): readonly InvalidGlob[] => {
  const glob = globOf({ pattern, isRef });
  if (Str.isEmpty(pattern)) {
    glob.fail("glob pattern cannot be empty");
    return glob.errors();
  }
  let more = validateStart(glob);
  while (more) {
    more = validateNext(glob);
  }
  return glob.errors();
};

const RELATIVE: readonly string[] = [".", ".."];

const isRelative = (body: string): boolean =>
  Arr.contains(RELATIVE, body) || Str.startsWith("./")(body) || Str.startsWith("../")(body);

export const validateRef = (pattern: string): readonly InvalidGlob[] => validate(pattern, true);

export const validatePath = (pattern: string): readonly InvalidGlob[] => {
  const trimmed = Str.trim(pattern);
  const errors: InvalidGlob[] = [];
  if (trimmed !== pattern) {
    errors.push({ message: PATH_ERRORS.spaces, column: START });
  }
  if (isRelative(Str.replace(/^!/u, "")(trimmed))) {
    errors.push({ message: PATH_ERRORS.relative, column: START });
  }
  if (errors.length > START) {
    return errors;
  }
  return validate(pattern, false);
};
