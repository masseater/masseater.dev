import { Effect, FileSystem, Schema } from "effect";

const LIBRARY_FILE = "fixtures/library.json";
const QUERIES_FILE = "fixtures/queries.json";

const Library = Schema.Struct({
  models: Schema.Array(Schema.String),
  textures: Schema.Array(Schema.String),
});

const QuerySchema = Schema.Struct({
  query: Schema.String,
  expected: Schema.NonEmptyArray(Schema.String),
});

const Queries = Schema.Array(QuerySchema);

/** @internal */
const readLibrary = Effect.gen(function* readLibrary() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString(LIBRARY_FILE);
  return yield* Schema.decodeEffect(Schema.fromJsonString(Library))(text);
});

/** @internal */
const readQueries = Effect.gen(function* readQueries() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString(QUERIES_FILE);
  return yield* Schema.decodeEffect(Schema.fromJsonString(Queries))(text);
});

type Query = typeof QuerySchema.Type;

export { readLibrary, readQueries };
export type { Query };
