import { Layer } from "effect";

import { runnerWith } from "#/shared/lib/run.ts";
import type { Run, Runner } from "#/shared/lib/run.ts";

export const layer: Layer.Layer<never> = Layer.empty;

export const runner: Runner = runnerWith(layer);

export const run: Run<never> = runner(Layer.empty);

export type { Run, Runner } from "#/shared/lib/run.ts";
