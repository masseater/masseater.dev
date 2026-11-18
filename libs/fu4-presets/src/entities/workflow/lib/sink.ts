import type { Position } from "@r_masseater/fu4";

export interface Sink {
  readonly error: (at: Position, message: string) => void;
}
