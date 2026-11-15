import type { Effect, Option } from "effect";

import type { getPerson } from "#/entities/person/@x/catalog";
import type { getSong } from "#/entities/song/@x/catalog";
import type { getVideo } from "#/entities/video/@x/catalog";

import type { search } from "./search.server";

type SongDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getSong>>>;
type VideoDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getVideo>>>;
type PersonDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getPerson>>>;
type SearchResults = Effect.Success<ReturnType<typeof search>>;

export type { PersonDetail, SearchResults, SongDetail, VideoDetail };
