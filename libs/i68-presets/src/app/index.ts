import type { I68Config } from "@r_masseater/i68";

import { pop } from "#/features/check-pop/index.ts";
import type { PopOptions } from "#/features/check-pop/index.ts";
import { voicing } from "#/features/check-voicing/index.ts";

export { classical, classicalPlugin } from "#/features/check-classical/index.ts";
export { DEFAULT_RANGES, pop, popPlugin } from "#/features/check-pop/index.ts";
export type { PopOptions, Range, Ranges } from "#/features/check-pop/index.ts";
export { voicing, voicingPlugin } from "#/features/check-voicing/index.ts";

export const recommended = (options: PopOptions = {}): I68Config => ({
  extends: [pop(options), voicing()],
});
