import type { Library, Style } from "#/entities/library/index.ts";
import { useCandidates } from "#/features/find-candidates/index.ts";
import type { Found } from "#/features/find-candidates/index.ts";
import { mapLoaded } from "#/shared/lib/index.ts";
import type { Loaded } from "#/shared/lib/index.ts";

import { splitOf } from "./pending.ts";
import type { Split } from "./pending.ts";

export type Judging = Readonly<{ found: Found; split: Split }>;

export const useJudging = (target: Readonly<{ library: Library; style: Style }>): Loaded<Judging> =>
  mapLoaded((found: Found): Judging => ({ found, split: splitOf(target)(found.list) }))(
    useCandidates(target),
  );
