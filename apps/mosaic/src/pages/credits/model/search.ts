import { Option } from "effect";

import { seedOf } from "#/shared/lib/seed";

const DEFAULT_SEED = 0;

export const creditsSearch = (
  search: Readonly<Record<string, unknown>>,
): Readonly<{ seed: number }> => ({
  seed: Option.getOrElse(seedOf(search), () => DEFAULT_SEED),
});
