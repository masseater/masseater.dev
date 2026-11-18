import { Array as Arr, pipe } from "effect";

import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type { DependabotInput } from "#/features/audit-workflows/model/input.ts";

import { annotated, rootLocation, withKeys } from "./location.ts";

export interface UpdateView {
  readonly index: number;
  readonly input: DependabotInput;
}

export const updatesOf = (input: DependabotInput): readonly UpdateView[] =>
  pipe(
    input.model.updates,
    Arr.map((_update, index) => ({ index, input })),
  );

export const updateLocation = (update: UpdateView): SymbolicLocation =>
  annotated("this update rule")(withKeys("updates", update.index)(rootLocation("this config")));

export const updateLocationWithGrip = (update: UpdateView): SymbolicLocation =>
  annotated("this ecosystem")(withKeys("package-ecosystem")(updateLocation(update)));
