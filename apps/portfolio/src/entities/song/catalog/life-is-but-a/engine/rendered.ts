import type { Lane } from "#/entities/song/model/program.ts";

import type { Mastered } from "./master.ts";

export interface Rendered extends Mastered {
  readonly roots: readonly number[];
  readonly automation: Readonly<Record<string, Lane>>;
}
