import { Array as Arr, Option, pipe } from "effect";

import type { ContextExpr } from "#/entities/expression-tree/index.ts";
import type { ActionStepModel } from "#/features/zizmor/model/action.ts";
import type { If } from "#/features/zizmor/model/common.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { ActionInput } from "#/features/zizmor/model/input.ts";
import type { StepBodyCommon, StepView } from "#/features/zizmor/model/step.ts";

import { keepsRunning } from "./conditions.ts";
import { envIsStatic } from "./expressions.ts";
import { annotated, rootLocation, withKeys } from "./location.ts";

export const actionLocation = (_action: ActionInput): SymbolicLocation =>
  rootLocation("this action");

export const dockerLocation = (action: ActionInput): SymbolicLocation =>
  withKeys("runs")(annotated("this Docker action")(actionLocation(action)));

const compositeLocation = (action: ActionInput, index: number): SymbolicLocation =>
  withKeys("runs", "steps", index)(annotated("this step")(actionLocation(action)));

const bodyOf = (model: ActionStepModel): StepBodyCommon => {
  if (model.body.type === "uses") {
    return model.body;
  }
  return { type: "run", run: model.body.run };
};

const gripOf = (location: SymbolicLocation, model: ActionStepModel): SymbolicLocation => {
  if (Option.isSome(model.name)) {
    return withKeys("name")(location);
  }
  if (Option.isSome(model.id)) {
    return withKeys("id")(location);
  }
  return location;
};

const shellOf = (
  location: SymbolicLocation,
  model: ActionStepModel,
): Option.Option<readonly [string, SymbolicLocation]> => {
  if (model.body.type !== "run" || model.body.shell.type !== "literal") {
    return Option.none();
  }
  return Option.some([
    model.body.shell.value,
    annotated("shell defined here")(withKeys("shell")(location)),
  ] as const);
};

const compositeView = (action: ActionInput, model: ActionStepModel, index: number): StepView => {
  const location = compositeLocation(action, index);
  return {
    kind: "composite",
    input: action,
    document: action.document,
    order: [index],
    name: model.name,
    id: model.id,
    if: model.if,
    env: model.env,
    body: bodyOf(model),
    location,
    locationWithGrip: gripOf(location, model),
    matrix: Option.none(),
    envIsStatic: (context: ContextExpr) => envIsStatic(context)([model.env]),
    shell: () => shellOf(location, model),
    getInput: (name: string) =>
      Option.liftPredicate("arbitrary" as const, () => action.model.inputs.includes(name)),
    job: Option.none(),
    action: Option.some(action),
    index,
  };
};

export const compositeSteps = (action: ActionInput): Option.Option<readonly StepView[]> => {
  const { runs } = action.model;
  if (runs.type !== "composite") {
    return Option.none();
  }
  return Option.some(
    pipe(
      runs.steps,
      Arr.flatMap((model, index) => {
        if (keepsRunning(model.if)) {
          return [compositeView(action, model, index)];
        }
        return [];
      }),
    ),
  );
};

export const actionConditions = (
  action: ActionInput,
): readonly (readonly [If, SymbolicLocation])[] =>
  Arr.flatMap(
    Option.getOrElse(compositeSteps(action), () => []),
    (step) => Arr.map(Option.toArray(step.if), (condition) => [condition, step.location] as const),
  );
