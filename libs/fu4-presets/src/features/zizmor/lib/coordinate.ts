import { Option, Result, pipe } from "effect";

import type {
  ControlEvaluation,
  ControlExpr,
  Coordinate,
  FieldType,
  Toggle,
  Usage,
} from "#/features/zizmor/model/coordinate.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

import { evaluateControl } from "./control.ts";
import { concretize, withKeys } from "./location.ts";
import { parsePattern, patternMatches, usesRef } from "./uses.ts";
import type { UsesPattern } from "./uses.ts";
import { parseVersion } from "./version.ts";

const pattern = (text: string): UsesPattern => Result.getOrThrow(parsePattern(text));

export const fixed = (text: string): Coordinate => ({ type: "fixed", pattern: pattern(text) });

export const configurable =
  (text: string) =>
  (control: ControlExpr): Coordinate => ({
    type: "configurable",
    pattern: pattern(text),
    control,
  });

export const field =
  (toggle: Toggle) =>
  (name: string) =>
  (fieldType: FieldType) =>
  (satisfiedByDefault: boolean): ControlExpr => ({
    type: "field",
    toggle,
    field: name,
    fieldType,
    satisfiedByDefault,
  });

export const all = (...exprs: readonly ControlExpr[]): ControlExpr => ({ type: "all", exprs });

export const any = (...exprs: readonly ControlExpr[]): ControlExpr => ({ type: "any", exprs });

export const not = (expr: ControlExpr): ControlExpr => ({ type: "not", expr });

export const lessThan = (raw: string): ControlExpr => ({
  type: "version-less-than",
  version: Option.getOrThrow(parseVersion(raw)),
});

export const coordinatePattern = (coordinate: Coordinate): UsesPattern => coordinate.pattern;

const usageFrom = (result: ControlEvaluation): Option.Option<Usage> => {
  if (result.verdict === "satisfied") {
    return Option.some({ type: "enabled", origins: result.origins });
  }
  if (result.verdict === "conditional") {
    return Option.some({ type: "conditional", origins: result.origins });
  }
  return Option.none();
};

export const usageOf =
  (coordinate: Coordinate) =>
  (step: StepView): Option.Option<Usage> => {
    const { body } = step;
    if (body.type !== "uses" || body.uses.type !== "repository") {
      return Option.none();
    }
    const { uses } = body;
    if (!patternMatches(coordinate.pattern)(usesRef(uses))) {
      return Option.none();
    }
    const located = Result.getSuccess(concretize(step.document)(withKeys("uses")(step.location)));
    return pipe(
      located,
      Option.flatMap((location): Option.Option<Usage> => {
        if (coordinate.type === "fixed") {
          return Option.some({ type: "always" });
        }
        if (body.with.type === "expr") {
          return Option.some({ type: "conditional", origins: [{ type: "with-expression" }] });
        }
        const subject = { uses, comments: location.concrete.comments, inputs: body.with.value };
        return usageFrom(evaluateControl(subject)(coordinate.control));
      }),
    );
  };
