import { Option } from "effect";

import { codePoints, quote, quoteChar } from "#/shared/text/index.ts";

export interface InvalidGlob {
  readonly message: string;
  readonly column: number;
}

export interface Glob {
  readonly isRef: boolean;
  readonly peek: () => Option.Option<string>;
  readonly next: () => Option.Option<string>;
  readonly fail: (message: string) => void;
  readonly prec: () => boolean;
  readonly setPrec: (value: boolean) => void;
  readonly errors: () => readonly InvalidGlob[];
}

const FIRST_LINE = 1;
const START = 0;
const NEXT = 1;
const NEWLINE = "\n";
const NUL = "\0";
const REPLACEMENT = "�";
const PRINTED_LENGTH = 3;

export const isPrint = (char: string): boolean =>
  char === "\\" || char === "'" || codePoints(quoteChar(char)).length === PRINTED_LENGTH;

export const describeChar = (char: Option.Option<string>): string =>
  quoteChar(Option.getOrElse(char, () => REPLACEMENT));

interface Place {
  readonly at: number;
  readonly line: number;
  readonly column: number;
}

export interface GlobInput {
  readonly pattern: string;
  readonly isRef: boolean;
}

const ORIGIN: Place = { at: START, line: FIRST_LINE, column: START };

const after = (place: Place, char: string): Place => {
  if (char === NEWLINE) {
    return { at: place.at + NEXT, line: place.line + NEXT, column: START };
  }
  return { ...place, at: place.at + NEXT, column: place.column + NEXT };
};

const columnOf = (place: Place): number => {
  if (place.line > FIRST_LINE) {
    return START;
  }
  return place.column;
};

export const globOf = ({ pattern, isRef }: GlobInput): Glob => {
  const chars = codePoints(pattern);
  const errors: InvalidGlob[] = [];
  let place = ORIGIN;
  let prec = false;
  const fail = (message: string): void => {
    errors.push({ message, column: columnOf(place) });
  };
  const peek = (): Option.Option<string> => Option.fromNullishOr(chars[place.at]);
  return {
    isRef,
    peek,
    next: () => {
      const char = peek();
      for (const found of Option.toArray(char)) {
        place = after(place, found);
        if (found === NUL) {
          fail(`error while scanning glob pattern ${quote(pattern)}: invalid character NUL`);
        }
      }
      return char;
    },
    fail,
    prec: () => prec,
    setPrec: (value) => {
      prec = value;
    },
    errors: () => errors,
  };
};
