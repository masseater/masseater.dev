import { Effect } from "effect";

import { references } from "#/entities/reference/index.ts";
import { shelfOf } from "#/pages/sashi/model/shelf.ts";
import type { Item } from "#/pages/sashi/model/shelf.ts";

export const loadShelf = (): Promise<readonly Item[]> =>
  Effect.runPromise(references.pipe(Effect.map(shelfOf)));
