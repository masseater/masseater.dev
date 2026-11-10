import { Effect } from "effect";

import { preloadModule } from "#/entities/entry/model/body";
import type { Entry } from "#/entities/entry/model/entry";

import { importFigures } from "./figure-chunks";

const figuresForPrerender = (): Effect.Effect<void> => {
  if (import.meta.env.SSR) {
    return importFigures;
  }
  return Effect.void;
};

const preloadBody = (location: Readonly<Pick<Entry, "category" | "slug">>): Effect.Effect<void> =>
  Effect.andThen(preloadModule(location), figuresForPrerender());

export { preloadBody };
