import { Array as Arr, Match, Option, pipe } from "effect";

import { asBoolean, consteval } from "#/entities/expression-tree/index.ts";
import type { Spanned } from "#/entities/expression-tree/index.ts";
import { atRaw, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import {
  annotated,
  primary,
  rootLocation,
  subfeatureLocation,
} from "#/features/zizmor/lib/location.ts";
import { parsedFenced, supportsTemplates } from "#/features/zizmor/lib/raw.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";
import { subfeatureOf } from "#/shared/subfeature/index.ts";

const meta = { ident: "unsound-ternary", desc: "unsound pseudo-ternary expression" } as const;

const isConstant = (spanned: Spanned): boolean => Option.isSome(consteval(spanned.expr));

const isFalsy = (spanned: Spanned): boolean =>
  Option.exists(consteval(spanned.expr), (value) => !asBoolean(value));

const orOperands = (spanned: Spanned): readonly Spanned[] => {
  const { expr } = spanned;
  if (!isConstant(spanned) && expr.type === "binary" && expr.op === "or") {
    return [...orOperands(expr.lhs), ...orOperands(expr.rhs)];
  }
  return [spanned];
};

type Collect = (spanned: Spanned) => readonly Spanned[];

const LAST = 1;
const ANNOTATION = pipe(
  rootLocation(""),
  annotated("pseudo-ternary has falsy true value"),
  primary,
);

const falsyTrueValue = (operand: Spanned): readonly Spanned[] => {
  const { expr } = operand;
  if (expr.type === "binary" && expr.op === "and" && isFalsy(expr.rhs)) {
    return [expr.rhs];
  }
  return [];
};

const orValues =
  (collect: Collect) =>
  (spanned: Spanned): readonly Spanned[] => {
    const operands = orOperands(spanned);
    const falsy = pipe(operands, Arr.dropRight(LAST), Arr.flatMap(falsyTrueValue));
    return [...falsy, ...pipe(operands, Arr.flatMap(collect))];
  };

const none = (): readonly Spanned[] => [];

const unsoundTrueValues: Collect = (spanned) => {
  if (isConstant(spanned)) {
    return [];
  }
  return Match.value(spanned.expr).pipe(
    Match.discriminatorsExhaustive("type")({
      literal: none,
      star: none,
      identifier: none,
      call: (expr) => pipe(expr.args, Arr.flatMap(unsoundTrueValues)),
      context: (expr) => pipe(expr.parts, Arr.flatMap(unsoundTrueValues)),
      binary: (expr) => {
        if (expr.op === "or") {
          return orValues(unsoundTrueValues)(spanned);
        }
        return [...unsoundTrueValues(expr.lhs), ...unsoundTrueValues(expr.rhs)];
      },
      not: (expr) => unsoundTrueValues(expr.inner),
      index: (expr) => unsoundTrueValues(expr.inner),
    }),
  );
};

export const unsoundTernary: Audit = {
  ...meta,
  raw: (input) => {
    if (!supportsTemplates(input)) {
      return [];
    }
    const locate = subfeatureLocation(input.document);
    return Arr.flatMap(parsedFenced(input), (span) =>
      Arr.map(unsoundTrueValues(span.parsed), (value) => {
        const at = subfeatureOf(span.start + value.origin.start)(value.origin.raw);
        return pipe(
          finding(meta),
          confidence("high"),
          severity("low"),
          atRaw(locate(ANNOTATION, at)),
        );
      }),
    );
  },
};
