import { DateTime, Effect, Option, Path, String as Str, pipe } from "effect";

import { readJson, writeJson } from "#/shared/lib/files.ts";

import { Catalog } from "./catalog.ts";
import type { CatalogValue } from "./catalog.ts";
import { ViewState } from "./view-state.ts";
import type { ViewStateValue } from "./view-state.ts";

const JST_OFFSET_HOURS = 9;
const DATE_START = 0;
const DATE_LENGTH = 10;
const FIRST_PAGE = 0;
export const TODAY = 0;
export const CATALOG_FILE = "catalog.json";
export const NICO_FILE = "nico.json";
export const YOUTUBE_FILE = "youtube.json";

export const jstDate = (offsetDays: number): Effect.Effect<string> =>
  DateTime.now.pipe(
    Effect.map((now) =>
      pipe(
        now,
        DateTime.add({ hours: JST_OFFSET_HOURS, days: offsetDays }),
        DateTime.formatIso,
        Str.slice(DATE_START, DATE_LENGTH),
      ),
    ),
  );

const emptyCatalog = (since: string): CatalogValue => ({
  crawl: { next: Option.some(FIRST_PAGE), since },
  songs: [],
});

/** @internal */
export const loadCatalog = Effect.fn("state.catalog.load")(function* loadCatalogFrom(
  state: string,
) {
  const path = yield* Path.Path;
  const now = yield* DateTime.now;
  const stored = yield* readJson({ codec: Catalog, file: path.join(state, CATALOG_FILE) });
  return Option.getOrElse(stored, () => emptyCatalog(DateTime.formatIso(now)));
});

/** @internal */
export const saveCatalog = Effect.fn("state.catalog.save")(function* saveCatalogTo({
  state,
  catalog,
}: Readonly<{ state: string; catalog: CatalogValue }>) {
  const path = yield* Path.Path;
  yield* writeJson({ codec: Catalog, file: path.join(state, CATALOG_FILE), value: catalog });
});

/** @internal */
export const loadViews = Effect.fn("state.views.load")(function* loadViewsFrom({
  state,
  file,
}: Readonly<{ state: string; file: string }>) {
  const path = yield* Path.Path;
  const stored = yield* readJson({ codec: ViewState, file: path.join(state, file) });
  return Option.getOrElse(stored, (): ViewStateValue => ({}));
});

/** @internal */
export const saveViews = Effect.fn("state.views.save")(function* saveViewsTo({
  state,
  file,
  value,
}: Readonly<{ state: string; file: string; value: ViewStateValue }>) {
  const path = yield* Path.Path;
  yield* writeJson({ codec: ViewState, file: path.join(state, file), value });
});
