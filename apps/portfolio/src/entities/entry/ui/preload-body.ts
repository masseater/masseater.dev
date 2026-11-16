import { Effect } from "effect";

import { preloadModule } from "#/entities/entry/model/body.ts";
import type { Entry } from "#/entities/entry/model/entry.ts";

import { importFigures } from "./figure-chunks.ts";

const figuresForPrerender = (): Effect.Effect<void> => {
  if (import.meta.env.SSR) {
    return importFigures;
  }
  return Effect.void;
};

export const preloadBody = (
  location: Readonly<Pick<Entry, "category" | "slug">>,
): Effect.Effect<void> => Effect.andThen(preloadModule(location), figuresForPrerender());
