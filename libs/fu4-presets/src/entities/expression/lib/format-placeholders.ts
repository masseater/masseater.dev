import { Array as Arr, Option } from "effect";

import { codePoints } from "#/shared/text/index.ts";

const NEXT = 1;
const FIRST = 0;
const ODD = 2;
const DIGIT = /^\d$/u;
const NUMBER = /^\d+$/u;

interface Scan {
  readonly start: Option.Option<number>;
  readonly end: Option.Option<number>;
}

const IDLE: Scan = { start: Option.none(), end: Option.none() };

const opened = (char: string, index: number): Scan => {
  if (char === "{") {
    return { start: Option.some(index + NEXT), end: Option.none() };
  }
  return IDLE;
};

const inside = (start: number, char: string, index: number): Scan => {
  if (char === "{" && index === start) {
    return IDLE;
  }
  if (char === "}") {
    if (index === start) {
      return IDLE;
    }
    return { start: Option.some(start), end: Option.some(index) };
  }
  if (DIGIT.test(char)) {
    return { start: Option.some(start), end: Option.none() };
  }
  return opened(char, index);
};

interface Span {
  readonly start: number;
  readonly end: number;
}

const placeholder = (
  chars: readonly string[],
  span: Span,
  after: number,
): Option.Option<number> => {
  const digits = Arr.join(chars.slice(span.start, span.end), "");
  if (
    (after - span.end) % ODD === NEXT &&
    NUMBER.test(digits) &&
    Number.isSafeInteger(Number(digits))
  ) {
    return Option.some(Number(digits));
  }
  return Option.none();
};

const closed = (
  chars: readonly string[],
  span: Span,
  index: number,
): Scan & { readonly found: Option.Option<number> } => ({
  ...opened(chars[index] ?? "", index),
  found: placeholder(chars, span, index),
});

const step = (
  chars: readonly string[],
  scan: Scan,
  index: number,
): Scan & { readonly found: Option.Option<number> } => {
  const char = chars[index] ?? "";
  if (Option.isNone(scan.start)) {
    return { ...opened(char, index), found: Option.none() };
  }
  if (Option.isNone(scan.end)) {
    return { ...inside(scan.start.value, char, index), found: Option.none() };
  }
  if (char === "}") {
    return { ...scan, found: Option.none() };
  }
  return closed(chars, { start: scan.start.value, end: scan.end.value }, index);
};

export const formatPlaceholders = (format: string): ReadonlySet<number> => {
  const chars = codePoints(format);
  const found = new Set<number>();
  let scan = IDLE;
  for (let index = FIRST; index <= chars.length; index += NEXT) {
    const next = step(chars, scan, index);
    for (const value of Option.toArray(next.found)) {
      found.add(value);
    }
    scan = next;
  }
  return found;
};
