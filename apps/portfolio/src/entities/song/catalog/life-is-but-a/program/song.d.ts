import type { Samples } from "@masseater.dev/daw-view";

import type {
  Form,
  Ledger,
  Progressing,
  SampleTable,
  View,
} from "#/entities/song/model/program.ts";

import type { Engine } from "./engine.js";

export interface Sink {
  readonly write: (
    ...input: readonly [
      name: string,
      left: Float32Array<ArrayBuffer>,
      right: Float32Array<ArrayBuffer>,
    ]
  ) => void;
}

export interface Rendering {
  readonly log: Ledger;
  readonly view: View;
  readonly tape?: Sink;
}

export type Mastered = Readonly<Record<"L" | "R", Float32Array<ArrayBuffer>>> &
  Readonly<{
    comp: Float32Array<ArrayBuffer>;
    lim: Float32Array<ArrayBuffer>;
    clip: readonly number[];
    dec: readonly number[];
  }>;

export type Program = Form &
  Readonly<{
    render: (
      ...input: readonly [
        engine: Engine,
        samples: Samples,
        table: SampleTable,
        progress: Progressing,
        rendering: Rendering,
      ]
    ) => Promise<Mastered>;
  }>;

export declare const songModule: () => Program;
