import { Clock, Console, Effect, FileSystem, Path, Schema, Stream } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { CHORDONOMICON_SOURCE, genreTablesOf } from "./genre-tables.ts";

const CSV_URL = `${CHORDONOMICON_SOURCE}/resolve/main/chordonomicon_v2.csv`;
const CSV_NAME = "chordonomicon_v2.csv";
const LIMITS = { order: 3, minCount: 20 };

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

export const genreFileOf = (genre: string): string =>
  `${genre.toLowerCase().replaceAll(" ", "-")}.json`;

const download = Effect.fn("downloadChordonomicon")(function* download(target: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  if (yield* fileSystem.exists(target)) {
    return;
  }
  const client = yield* HttpClient.HttpClient;
  const response = yield* client
    .get(CSV_URL)
    .pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  yield* Stream.run(response.stream, fileSystem.sink(`${target}.part`));
  yield* fileSystem.rename(`${target}.part`, target);
});

/** @internal */
export const writeGenreTables = Effect.fn("i68.write-genre-tables")(function* writeGenreTables(
  cache: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const started = yield* Clock.currentTimeMillis;
  yield* fileSystem.makeDirectory(cache, { recursive: true });
  const csv = path.join(cache, CSV_NAME);
  yield* download(csv);
  const built = yield* genreTablesOf(fileSystem.stream(csv), LIMITS);
  for (const table of built.tables) {
    const genre = table.name.replace(/^Chordonomicon ?/u, "") || "all";
    const text = yield* encodeJson(table);
    yield* fileSystem.writeFileString(path.join(cache, genreFileOf(genre)), `${text}\n`);
    yield* Console.log(
      `${table.name}: ${String(Object.keys(table.transitions).length)} contexts, ${String(text.length)} bytes`,
    );
  }
  const finished = yield* Clock.currentTimeMillis;
  yield* Console.log(`${String(built.songs)} songs, ${String(finished - started)}ms`);
});
