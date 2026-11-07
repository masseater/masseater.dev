import type { Effect, Option } from "effect";

import type { getPerson } from "./person.server";
import type { search } from "./search.server";
import type { getSong } from "./song.server";
import type { getVideo } from "./video.server";

type SongDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getSong>>>;
type VideoDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getVideo>>>;
type PersonDetail = Option.Option.Value<Effect.Success<ReturnType<typeof getPerson>>>;
type SearchResults = Effect.Success<ReturnType<typeof search>>;

export type { PersonDetail, SearchResults, SongDetail, VideoDetail };
