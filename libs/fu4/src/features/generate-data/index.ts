import { Array as Arr, Effect, FileSystem, Path, Record as Rec, Schema, pipe } from "effect";

import { actionVocabulary } from "./model/action-schema.ts";
import { availability } from "./model/availability.ts";
import { permissions } from "./model/permissions.ts";
import { popularActions } from "./model/popular.ts";
import { runners } from "./model/runners.ts";
import { shells } from "./model/shells.ts";
import { webhooks } from "./model/webhooks.ts";

const INDENT = 2;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown, { space: INDENT }));

/** @internal */
export const generateData = Effect.fn("fu4.generate-data")(function* generateData(output: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const data = yield* Effect.all(
    {
      "availability.json": availability,
      "webhooks.json": webhooks,
      "popular-actions.json": popularActions,
      "permissions.json": permissions,
      "shells.json": shells,
      "runners.json": runners,
      "action.json": actionVocabulary,
    },
    { concurrency: "unbounded" },
  );
  yield* fileSystem.makeDirectory(output, { recursive: true });
  yield* pipe(
    Rec.toEntries(data),
    Arr.map(([name, value]) =>
      encodeJson(value).pipe(
        Effect.flatMap((json) => fileSystem.writeFileString(path.join(output, name), `${json}\n`)),
      ),
    ),
    Effect.all,
  );
});
