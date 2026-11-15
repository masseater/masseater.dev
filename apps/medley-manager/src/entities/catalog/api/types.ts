import type { Effect, Option } from "effect";

import type { getPerson } from "#/entities/person/@x/catalog.ts";
import type { getSong } from "#/entities/song/@x/catalog.ts";
import type { getVideo } from "#/entities/video/@x/catalog.ts";

import type { search } from "./search.server";

export type SongDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getSong>>>;
export type VideoDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getVideo>>>;
export type PersonDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getPerson>>>;
export type SearchResults = Effect.Success<ReturnType<typeof search>>;
