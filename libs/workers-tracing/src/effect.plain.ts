import { Layer } from "effect";

import { runnerWith } from "./run.ts";
import type { Run, Runner } from "./run.ts";

export const layer: Layer.Layer<never> = Layer.empty;

export const runner: Runner = runnerWith(layer);

export const run: Run<never> = runner(Layer.empty);

export type { Run, Runner } from "./run.ts";
