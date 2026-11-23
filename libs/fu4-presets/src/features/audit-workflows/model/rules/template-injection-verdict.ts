import { Array as Arr, Option, pipe } from "effect";

import {
  asPattern,
  childOf,
  matchesPattern,
  singleTail,
} from "#/entities/expression-tree/index.ts";
import type { ContextExpr } from "#/entities/expression-tree/index.ts";
import { capabilityOf } from "#/features/audit-workflows/lib/capabilities.ts";
import { expandsToStaticValues } from "#/features/audit-workflows/lib/matrix.ts";
import type { Confidence, Persona, Severity } from "#/features/audit-workflows/model/finding.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";

export type Verdict = readonly [Severity, Confidence, Persona];

const isSecret = childOf("secrets");
const isInput = childOf("inputs");
const isEnv = childOf("env");
const isGithub = childOf("github");
const isMatrix = childOf("matrix");
const SAFE = Arr.map(["needs.*.result", "steps.*.outcome", "steps.*.conclusion"], matchesPattern);

const UNKNOWN: Verdict = ["informational", "low", "regular"];

const isSafe = (context: ContextExpr): boolean =>
  pipe(
    SAFE,
    Arr.some((test) => test(context)),
  );

const envVerdict = (context: ContextExpr, view: StepView): Verdict => {
  if (view.envIsStatic(context)) {
    return ["low", "high", "pedantic"];
  }
  return ["low", "high", "regular"];
};

const controlledVerdict = (capability: string): Verdict => {
  if (capability === "structured") {
    return ["medium", "high", "regular"];
  }
  return ["high", "high", "regular"];
};

const inputVerdict = (context: ContextExpr, view: StepView): Verdict =>
  pipe(
    singleTail(context),
    Option.flatMap(view.getInput),
    Option.match({
      onNone: (): Verdict => ["low", "low", "regular"],
      onSome: (capability): Verdict => {
        if (capability === "fixed") {
          return ["low", "high", "pedantic"];
        }
        if (capability === "structured") {
          return ["medium", "high", "regular"];
        }
        return ["high", "high", "regular"];
      },
    }),
  );

type Judge = (context: ContextExpr, view: StepView) => Option.Option<Verdict>;

const matrixVerdict: Judge = (context, view) =>
  pipe(
    view.matrix,
    Option.filter((matrix) => !expandsToStaticValues(matrix)(context)),
    Option.map((): Verdict => ["medium", "medium", "regular"]),
  );

const JUDGES: readonly (readonly [(context: ContextExpr) => boolean, Judge])[] = [
  [(context) => isSecret(context) || isSafe(context), () => Option.none()],
  [isInput, (context, view) => Option.some(inputVerdict(context, view))],
  [isEnv, (context, view) => Option.some(envVerdict(context, view))],
  [isGithub, () => Option.some(["high", "high", "regular"])],
  [isMatrix, matrixVerdict],
];

const unknownVerdict: Judge = (context, view) =>
  pipe(
    JUDGES,
    Arr.findFirst(([matches]) => matches(context)),
    Option.match({
      onNone: () => Option.some(UNKNOWN),
      onSome: ([, judge]) => judge(context, view),
    }),
  );

export const classify =
  (view: StepView) =>
  (context: ContextExpr): Option.Option<Verdict> =>
    Option.match(asPattern(context), {
      onNone: () => Option.some(UNKNOWN),
      onSome: (pattern) =>
        Option.match(capabilityOf(pattern), {
          onNone: () => unknownVerdict(context, view),
          onSome: (capability) => {
            if (capability === "fixed") {
              return Option.none();
            }
            return Option.some(controlledVerdict(capability));
          },
        }),
    });
