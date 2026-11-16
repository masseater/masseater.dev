import { Array as Arr, Effect, Option } from "effect";

import { listPeople } from "#/entities/person/@x/catalog.ts";
import { listSongs } from "#/entities/song/@x/catalog.ts";
import { listVideos } from "#/entities/video/@x/catalog.ts";
import { keywordOf } from "#/shared/db/index.server.ts";

const SEARCH_LIMIT = 20;

export const search = Effect.fn("catalog.search")(function* search(raw: string | undefined) {
  const keyword = keywordOf(raw);
  if (Option.isNone(keyword)) {
    return { songs: [], videos: [], people: [] };
  }
  const found = yield* Effect.all(
    {
      songs: listSongs(keyword),
      videos: listVideos({ keyword: keyword.value }),
      people: listPeople(keyword),
    },
    { concurrency: "unbounded" },
  );
  return {
    songs: Arr.take(found.songs, SEARCH_LIMIT),
    videos: Arr.take(found.videos, SEARCH_LIMIT),
    people: Arr.take(found.people, SEARCH_LIMIT),
  };
});
