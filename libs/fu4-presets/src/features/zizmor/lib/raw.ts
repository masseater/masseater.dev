import { Array as Arr, Option, pipe } from "effect";

import type { Spanned } from "#/entities/expression-tree/index.ts";
import type { Location } from "#/features/zizmor/model/finding.ts";
import type { AuditInput } from "#/features/zizmor/model/input.ts";

import { fencedInRoute, parseBare } from "./expressions.ts";
import { annotated, primary, rootLocation, spanFeature } from "./location.ts";

export interface ParsedFenced {
  readonly parsed: Spanned;
  readonly start: number;
  readonly end: number;
}

export const supportsTemplates = (input: AuditInput): boolean =>
  input.kind === "workflow" || input.kind === "action";

export const parsedFenced = (input: AuditInput): readonly ParsedFenced[] =>
  pipe(
    fencedInRoute(input.document)([]),
    Arr.flatMap((fenced) =>
      pipe(
        parseBare(fenced.expr.raw),
        Option.map((parsed) => ({ parsed, start: fenced.start, end: fenced.end })),
        Option.toArray,
      ),
    ),
  );

export const spanLocation =
  (input: AuditInput) =>
  (annotation: string) =>
  (span: ParsedFenced): Location => ({
    symbolic: primary(annotated(annotation)(rootLocation(annotation))),
    concrete: spanFeature(input.document)(span),
  });
