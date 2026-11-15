import type { Effect, Option } from "effect";

import type { getPerson } from "./person.server";
import type { search } from "./search.server";
import type { getSong } from "./song.server";
import type { getVideo } from "./video.server";

export type SongDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getSong>>>;
export type VideoDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getVideo>>>;
export type PersonDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getPerson>>>;
export type SearchResults = Effect.Success<ReturnType<typeof search>>;
