import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import { atoi, quote } from "#/shared/text/index.ts";

import type { Bounds } from "./bounds.ts";

export interface Field {
  readonly values: readonly number[];
  readonly star: boolean;
}

interface Span {
  readonly start: number;
  readonly end: number;
  readonly star: boolean;
  readonly step: number;
}

const ONE = 1;
const PAIR = 2;
const NONE = 0;
const UINT32_MAX = 4_294_967_295;
const WILDCARDS: readonly string[] = ["*", "?"];

const parseNumber = (expr: string): Result.Result<number, string> => {
  const parsed = atoi(expr);
  if (typeof parsed === "string") {
    return Result.fail(
      `failed to parse int from ${expr}: strconv.Atoi: parsing ${quote(expr)}: ${parsed}`,
    );
  }
  if (parsed < NONE) {
    return Result.fail(`negative number (${String(parsed)}) not allowed: ${expr}`);
  }
  if (parsed > UINT32_MAX) {
    return Result.fail(`end of range (${String(parsed)}) above maximum: ${expr}`);
  }
  return Result.succeed(parsed);
};

const parseIntOrName =
  (bounds: Bounds) =>
  (expr: string): Result.Result<number, string> =>
    pipe(
      bounds.names,
      Arr.findFirstIndex((name) => name === Str.toLowerCase(expr)),
      Option.match({
        onNone: () => parseNumber(expr),
        onSome: (index) => Result.succeed(index + Number(bounds.min === ONE)),
      }),
    );

const explicitSpan =
  (expr: string, bounds: Bounds) =>
  (parts: readonly string[]): Result.Result<Span, string> => {
    if (parts.length > PAIR) {
      return Result.fail(`too many hyphens: ${expr}`);
    }
    const parse = parseIntOrName(bounds);
    const head = Arr.getUnsafe(parts, NONE);
    const tail = Option.getOrElse(Arr.get(parts, ONE), () => head);
    return Result.flatMap(parse(head), (start) =>
      Result.map(parse(tail), (end) => ({ start, end, star: false, step: ONE })),
    );
  };

const spanOf =
  (expr: string, bounds: Bounds) =>
  (parts: readonly string[]): Result.Result<Span, string> => {
    if (Arr.contains(WILDCARDS, Arr.getUnsafe(parts, NONE))) {
      return Result.succeed({ start: bounds.min, end: bounds.max, star: true, step: ONE });
    }
    return explicitSpan(expr, bounds)(parts);
  };

const endOf = (span: Span, bounds: Bounds, single: boolean): number => {
  if (single) {
    return bounds.max;
  }
  return span.end;
};

const withStep =
  (bounds: Bounds, single: boolean) =>
  (span: Span) =>
  (text: string): Result.Result<Span, string> =>
    Result.map(parseNumber(text), (step) => ({
      start: span.start,
      end: endOf(span, bounds, single),
      star: span.star && step <= ONE,
      step,
    }));

const steppedSpan = (expr: string, bounds: Bounds): Result.Result<Span, string> => {
  const steps = Str.split("/")(expr);
  if (steps.length > PAIR) {
    return Result.fail(`too many slashes: ${expr}`);
  }
  const ranges = Str.split("-")(Arr.getUnsafe(steps, NONE));
  const step = withStep(bounds, ranges.length === ONE);
  return Result.flatMap(spanOf(expr, bounds)(ranges), (span) =>
    Option.match(Arr.get(steps, ONE), {
      onNone: () => Result.succeed(span),
      onSome: step(span),
    }),
  );
};

const validated =
  (expr: string, bounds: Bounds) =>
  (span: Span): Result.Result<Span, string> => {
    if (span.start < bounds.min) {
      return Result.fail(
        `beginning of range (${String(span.start)}) below minimum (${String(bounds.min)}): ${expr}`,
      );
    }
    if (span.end > bounds.max) {
      return Result.fail(
        `end of range (${String(span.end)}) above maximum (${String(bounds.max)}): ${expr}`,
      );
    }
    if (span.start > span.end) {
      return Result.fail(
        `beginning of range (${String(span.start)}) beyond end of range (${String(span.end)}): ${expr}`,
      );
    }
    if (span.step === NONE) {
      return Result.fail(`step of range should be a positive number: ${expr}`);
    }
    return Result.succeed(span);
  };

const valuesOf = (span: Span): readonly number[] => {
  const values: number[] = [];
  for (let value = span.start; value <= span.end; value += span.step) {
    values.push(value);
  }
  return values;
};

const merge = (left: Field, right: Field): Field => ({
  values: Arr.union(left.values, right.values),
  star: left.star || right.star,
});

export const fieldOf =
  (bounds: Bounds) =>
  (text: string): Result.Result<Field, string> => {
    let out: Field = { values: [], star: false };
    for (const expr of pipe(Str.split(",")(text), Arr.filter(Str.isNonEmpty))) {
      const span = Result.flatMap(steppedSpan(expr, bounds), validated(expr, bounds));
      if (Result.isFailure(span)) {
        return Result.fail(span.failure);
      }
      out = merge(out, { values: valuesOf(span.success), star: span.success.star });
    }
    return Result.succeed(out);
  };
