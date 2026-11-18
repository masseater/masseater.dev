import type { Lane } from "@masseater.dev/fumx-studio/daw/view";

import type { Mastered } from "./master.ts";

export interface Rendered extends Mastered {
  readonly roots: readonly number[];
  readonly automation: Readonly<Record<string, Lane>>;
}
