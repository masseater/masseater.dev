import { Option } from "effect";

import { seedOf } from "#/shared/lib/seed.ts";

interface MosaicSearch {
  readonly seed?: number;
}

export const mosaicSearch = (search: Readonly<Record<string, unknown>>): MosaicSearch =>
  Option.match(seedOf(search), {
    onNone: (): MosaicSearch => ({}),
    onSome: (seed): MosaicSearch => ({ seed }),
  });
