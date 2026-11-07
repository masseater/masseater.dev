import { Effect, FileSystem, Path } from "effect";
import { SqlClient } from "effect/sql";

import { Settings } from "#shared/settings";

const LIBRARY_FOLDER = "library";

/** @internal */
const libraryFolder = Effect.gen(function* libraryFolder() {
  const { dataDirectory } = yield* Settings;
  const path = yield* Path.Path;
  return path.join(dataDirectory, LIBRARY_FOLDER);
});

/** @internal */
const ensureLibraryFolder = Effect.gen(function* ensureLibraryFolder() {
  const fileSystem = yield* FileSystem.FileSystem;
  const sql = yield* SqlClient.SqlClient;
  const folder = yield* libraryFolder;
  yield* fileSystem.makeDirectory(folder, { recursive: true });
  yield* sql`insert into sources(path, kind) values (${folder}, 'folder') on conflict(path) do nothing`;
  return folder;
}).pipe(Effect.withSpan("ensureLibraryFolder"));

export { ensureLibraryFolder, libraryFolder };
