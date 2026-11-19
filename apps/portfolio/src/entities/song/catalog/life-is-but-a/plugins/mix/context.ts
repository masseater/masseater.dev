import type { Bus } from "@masseater.dev/fumx-studio/studio/bus";
import type { Studio } from "@masseater.dev/fumx-studio/studio/studio";
import type { Grid } from "@masseater.dev/fumx-studio/studio/timing";
import type { Option } from "effect";

export interface Rack {
  readonly get: (name: string) => Bus;
}

export interface Times {
  readonly all: () => readonly number[];
}

export interface Sink {
  readonly write: (
    name: string,
    left: Float32Array<ArrayBuffer>,
    right: Float32Array<ArrayBuffer>,
  ) => void;
}

export interface Impulses {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

export interface Life {
  readonly studio: Studio;
  readonly quiet: Studio;
  readonly grid: Grid;
  readonly rack: Rack;
  readonly kicks: Times;
  readonly cutoffs: Float32Array;
  readonly impulses: Impulses;
  readonly tape: Option.Option<Sink>;
}
