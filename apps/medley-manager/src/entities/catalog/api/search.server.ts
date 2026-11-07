import { Array as Arr, Effect, Option } from "effect";

import { keywordOf } from "./db.server";
import { listPeople } from "./people.server";
import { listSongs } from "./songs.server";
import { listVideos } from "./videos.server";

const SEARCH_LIMIT = 20;

const search = Effect.fn("catalog.search")(function* search(raw: string | undefined) {
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

export { search };
