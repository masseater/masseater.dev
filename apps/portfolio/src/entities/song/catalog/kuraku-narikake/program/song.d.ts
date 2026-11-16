import type { Samples } from "@masseater.dev/daw-view";

import type {
  Form,
  Ledger,
  Progressing,
  SampleTable,
  View,
} from "#/entities/song/model/program.ts";

import type { Engine, Stem } from "./engine.js";

export interface Slot {
  readonly name: string;
  readonly drum: boolean;
}

export interface Block {
  readonly channels: number;
  readonly scale: number;
  readonly data: ArrayLike<number>;
}

export interface Blocks {
  readonly frames: number;
  readonly block: (index: number) => Promise<readonly Block[]>;
}

export type Master = Readonly<Record<"L" | "R", Float32Array<ArrayBuffer>>> &
  Readonly<{
    par: unknown;
    auto: Readonly<Record<string, Float32Array<ArrayBuffer>>>;
  }>;

export type Session = Readonly<Record<"N", number>> &
  Readonly<{
    tracks: readonly string[];
    cost: readonly string[];
    track: (name: string) => Stem;
    master: (
      ...input: readonly [stems: readonly Slot[], tape: Blocks, progress: Progressing]
    ) => Promise<Master>;
  }>;

export interface Opening {
  readonly log: Ledger;
  readonly view?: View;
  readonly mix?: unknown;
  readonly edits?: boolean;
}

export type Program = Form &
  Readonly<{
    open: (
      ...input: readonly [engine: Engine, samples: Samples, table: SampleTable, opening: Opening]
    ) => Session;
  }>;

export declare const songModule: () => Program;
