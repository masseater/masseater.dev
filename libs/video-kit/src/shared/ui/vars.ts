import { Array as Arr, Record as Rec, pipe } from "effect";

import type { CssVariables } from "#/shared/lib/css-variables.ts";

export const sizeVars = (size: number): CssVariables => ({ "--size": size });

export const markVars = (mark: number): CssVariables => ({ "--mark": mark });

export const progressVars = (progress: number): CssVariables => ({ "--progress": progress });

export const driftVars = (pixels: number): CssVariables => ({ "--drift": `${pixels}px` });

export const zoomVars = (zoom: number): CssVariables => ({ "--zoom": zoom });

export const merge = (all: readonly CssVariables[]): CssVariables =>
  pipe(
    all,
    Arr.flatMap((vars) => Rec.toEntries(vars)),
    (entries) => Rec.fromEntries(entries),
  );
