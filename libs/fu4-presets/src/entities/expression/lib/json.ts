import { Option, String as Str, pipe } from "effect";

import { quoteChar } from "#/shared/text/index.ts";

export interface JsonError {
  readonly offset: number;
  readonly message: string;
}

interface Scanner {
  readonly peek: () => Option.Option<string>;
  readonly skip: () => void;
  readonly position: () => number;
  readonly size: number;
}

type Step = Option.Option<JsonError>;

const OK: Step = Option.none();
const NEXT = 1;
const FIRST = 0;
const HEX_DIGITS = 4;
const CONTROL_END = 0x20;
const SPACES = new Set([" ", "\t", "\r", "\n"]);
const ESCAPES = new Set(["b", "f", "n", "r", "t", "\\", "/", '"']);
const DIGIT = /^\d$/u;
const HEX = /^[\dA-Fa-f]$/u;
const NUMBER_START = /^[-\d]$/u;
const NONZERO = /^[1-9]$/u;

const at = (scan: Scanner, char: string): boolean =>
  Option.exists(scan.peek(), (found) => found === char);
const matching = (scan: Scanner, pattern: RegExp): boolean =>
  Option.exists(scan.peek(), (found) => pattern.test(found));

const invalid = (scan: Scanner, context: string): Step =>
  Option.some(
    Option.match(scan.peek(), {
      onNone: () => ({ offset: scan.size, message: "unexpected end of JSON input" }),
      onSome: (char) => ({
        offset: scan.position() + NEXT,
        message: `invalid character ${quoteChar(char)} ${context}`,
      }),
    }),
  );

const space = (scan: Scanner): void => {
  while (Option.exists(scan.peek(), (found) => SPACES.has(found))) {
    scan.skip();
  }
};

const digits = (scan: Scanner): void => {
  while (matching(scan, DIGIT)) {
    scan.skip();
  }
};

const literal =
  (word: string) =>
  (scan: Scanner): Step => {
    scan.skip();
    for (const expected of Str.slice(NEXT)(word)) {
      if (!at(scan, expected)) {
        return invalid(scan, `in literal ${word} (expecting ${quoteChar(expected)})`);
      }
      scan.skip();
    }
    return OK;
  };

const fraction = (scan: Scanner): Step => {
  if (!at(scan, ".")) {
    return OK;
  }
  scan.skip();
  if (!matching(scan, DIGIT)) {
    return invalid(scan, "after decimal point in numeric literal");
  }
  digits(scan);
  return OK;
};

const exponent = (scan: Scanner): Step => {
  if (!at(scan, "e") && !at(scan, "E")) {
    return OK;
  }
  scan.skip();
  if (at(scan, "+") || at(scan, "-")) {
    scan.skip();
  }
  if (!matching(scan, DIGIT)) {
    return invalid(scan, "in exponent of numeric literal");
  }
  digits(scan);
  return OK;
};

const number = (scan: Scanner): Step => {
  if (at(scan, "-")) {
    scan.skip();
  }
  if (at(scan, "0")) {
    scan.skip();
  } else if (matching(scan, NONZERO)) {
    digits(scan);
  } else {
    return invalid(scan, "in numeric literal");
  }
  return pipe(
    fraction(scan),
    Option.orElse(() => exponent(scan)),
  );
};

const unicode = (scan: Scanner): Step => {
  scan.skip();
  for (let index = 0; index < HEX_DIGITS; index += NEXT) {
    if (!matching(scan, HEX)) {
      return invalid(scan, String.raw`in \u hexadecimal character escape`);
    }
    scan.skip();
  }
  return OK;
};

const escape = (scan: Scanner): Step => {
  scan.skip();
  if (Option.exists(scan.peek(), (found) => ESCAPES.has(found))) {
    scan.skip();
    return OK;
  }
  if (at(scan, "u")) {
    return unicode(scan);
  }
  return invalid(scan, "in string escape code");
};

const isControl = (scan: Scanner): boolean =>
  Option.exists(Option.flatMap(scan.peek(), Str.codePointAt(FIRST)), (code) => code < CONTROL_END);

const stringStep = (scan: Scanner): Option.Option<Step> => {
  if (Option.isNone(scan.peek()) || isControl(scan)) {
    return Option.some(invalid(scan, "in string literal"));
  }
  if (at(scan, '"')) {
    scan.skip();
    return Option.some(OK);
  }
  if (at(scan, "\\")) {
    return pipe(escape(scan), Option.map(Option.some));
  }
  scan.skip();
  return Option.none();
};

const string = (scan: Scanner): Step => {
  scan.skip();
  let done = stringStep(scan);
  while (Option.isNone(done)) {
    done = stringStep(scan);
  }
  return done.value;
};

type Value = (scan: Scanner) => Step;

const member =
  (value: Value) =>
  (scan: Scanner): Step => {
    if (!at(scan, '"')) {
      return invalid(scan, "looking for beginning of object key string");
    }
    return pipe(
      string(scan),
      Option.orElse(() => {
        space(scan);
        if (!at(scan, ":")) {
          return invalid(scan, "after object key");
        }
        scan.skip();
        return value(scan);
      }),
    );
  };

const closes =
  (close: string, context: string) =>
  (scan: Scanner): Option.Option<Step> => {
    space(scan);
    if (at(scan, ",")) {
      scan.skip();
      return Option.none();
    }
    if (at(scan, close)) {
      scan.skip();
      return Option.some(OK);
    }
    return Option.some(invalid(scan, context));
  };

const items =
  (item: Value, after: (scan: Scanner) => Option.Option<Step>) =>
  (scan: Scanner): Step => {
    for (;;) {
      const failed = item(scan);
      if (Option.isSome(failed)) {
        return failed;
      }
      const done = after(scan);
      if (Option.isSome(done)) {
        return done.value;
      }
    }
  };

const sequence =
  (close: string, item: Value, after: (scan: Scanner) => Option.Option<Step>) =>
  (scan: Scanner): Step => {
    scan.skip();
    space(scan);
    if (at(scan, close)) {
      scan.skip();
      return OK;
    }
    return items(item, after)(scan);
  };

const objectAfter = (scan: Scanner): Option.Option<Step> =>
  pipe(
    closes("}", "after object key:value pair")(scan),
    Option.orElse(() => {
      space(scan);
      return Option.none();
    }),
  );

const STARTS: ReadonlyMap<string, (value: Value) => Value> = new Map<
  string,
  (value: Value) => Value
>([
  ["{", (value) => sequence("}", member(value), objectAfter)],
  ["[", (value) => sequence("]", value, closes("]", "after array element"))],
  ['"', () => string],
  ["t", () => literal("true")],
  ["f", () => literal("false")],
  ["n", () => literal("null")],
]);

const value: Value = (scan) => {
  space(scan);
  if (matching(scan, NUMBER_START)) {
    return number(scan);
  }
  return Option.match(
    Option.flatMap(scan.peek(), (char) => Option.fromNullishOr(STARTS.get(char))),
    {
      onNone: () => invalid(scan, "looking for beginning of value"),
      onSome: (start) => start(value)(scan),
    },
  );
};

const scannerOf = (text: string): Scanner => {
  const bytes = new TextEncoder().encode(text);
  let position = FIRST;
  return {
    peek: () =>
      pipe(
        Option.fromNullishOr(bytes[position]),
        Option.map((byte) => String.fromCodePoint(byte)),
      ),
    skip: () => {
      position += NEXT;
    },
    position: () => position,
    size: bytes.length,
  };
};

export const checkJson = (text: string): Option.Option<JsonError> => {
  const scan = scannerOf(text);
  return pipe(
    value(scan),
    Option.orElse(() => {
      space(scan);
      if (Option.isSome(scan.peek())) {
        return invalid(scan, "after top-level value");
      }
      return OK;
    }),
  );
};
