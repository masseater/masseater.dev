import { Array, Effect, pipe } from "effect";

import { rowsInOrder, scopedPage, unscored } from "./result-row.ts";
import type { Scope } from "./result-row.ts";

interface BrowseQuery extends Scope {
  readonly offset: number;
  readonly limit: number;
}

/** @internal */
const browse = Effect.fn("browse")(function* browseAssets({
  packageId,
  kinds,
  offset,
  limit,
}: BrowseQuery) {
  const scope = { packageId, kinds };
  const { ids, total } = yield* scopedPage({ scope, offset, limit });
  const rows = yield* rowsInOrder(ids, scope);
  return { assets: pipe(rows, Array.map(unscored)), total };
});

export { browse };
export type { BrowseQuery };
