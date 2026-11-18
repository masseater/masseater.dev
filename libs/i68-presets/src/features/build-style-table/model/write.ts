import { Clock, Console, Effect, FileSystem, Path, Schema } from "effect";

import { buildBachTable } from "./build.ts";

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

/** @internal */
export const writeStyleTables = Effect.fn("i68.write-style-tables")(function* writeStyleTables(
  output: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const started = yield* Clock.currentTimeMillis;
  const built = yield* buildBachTable();
  const text = yield* encodeJson(built.table);
  yield* fileSystem.writeFileString(path.join(output, "bach-chorales.json"), `${text}\n`);
  const finished = yield* Clock.currentTimeMillis;
  yield* Console.log(
    `${String(built.scores)} chorales, ${String(built.contexts)} contexts, ${String(text.length)} bytes, ${String(finished - started)}ms`,
  );
});
