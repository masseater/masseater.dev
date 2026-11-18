import { ENDPOINT_FILE } from "@masseater.dev/local-server";
import {
  Array as Arr,
  Clock,
  Context,
  Duration,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Schema,
  pipe,
} from "effect";

import type { Suggestion } from "#/shared/api/index.ts";
import { IDLE_LIMIT, SERVER_FLAG } from "#/shared/config/index.ts";
import { runDetached } from "#/shared/lib/detach.ts";

import { KoganeClient, koganeClientLayer } from "./client.ts";
import { suggestionsText } from "./suggestions-text.ts";

const STARTING_FILE = "starting";
const START_GRACE_MINUTES = 1;
const ANSWER_SECONDS = 3;
const START_GRACE = Duration.minutes(START_GRACE_MINUTES);
const ANSWER_LIMIT = Duration.seconds(ANSWER_SECONDS);
const NO_SUGGESTIONS: readonly Suggestion[] = [];

const PromptInput = Schema.Struct({ prompt: Schema.String, cwd: Schema.String });

const decodeInput = Schema.decodeUnknownEffect(Schema.fromJsonString(PromptInput));

const HookOutput = Schema.Struct({
  hookSpecificOutput: Schema.Struct({
    hookEventName: Schema.Literal("UserPromptSubmit"),
    additionalContext: Schema.String,
  }),
});

const encodeOutput = Schema.encodeEffect(Schema.fromJsonString(HookOutput));

const youngerThan = Effect.fn("youngerThan")(function* youngerThan(
  file: string,
  limit: Duration.Duration,
) {
  const fs = yield* FileSystem.FileSystem;
  const now = yield* Clock.currentTimeMillis;
  const info = yield* Effect.option(fs.stat(file));
  return pipe(
    info,
    Option.flatMap(({ mtime }) => mtime),
    Option.exists((time) => now - time.getTime() < Duration.toMillis(limit)),
  );
});

const startServer = Effect.fn("startServer")(function* startServer(dataDirectory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const marker = path.join(dataDirectory, STARTING_FILE);
  const starting = yield* youngerThan(marker, START_GRACE);
  if (starting) {
    return;
  }
  yield* fs.makeDirectory(dataDirectory, { recursive: true });
  yield* fs.writeFileString(marker, "");
  yield* runDetached(["serve", `--${SERVER_FLAG}`, dataDirectory]);
});

const answer = (
  suggestions: readonly Suggestion[],
): Effect.Effect<Option.Option<string>, Schema.SchemaError> => {
  if (!Arr.isReadonlyArrayNonEmpty(suggestions)) {
    return Effect.succeedNone;
  }
  return Effect.asSome(
    encodeOutput({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: suggestionsText(suggestions),
      },
    }),
  );
};

const suggestOnce = Effect.fn("suggestOnce")(function* suggestOnce(
  dataDirectory: string,
  request: Readonly<{ directory: string; prompt: string }>,
) {
  const context = yield* Layer.build(koganeClientLayer(dataDirectory));
  const client = Context.get(context, KoganeClient);
  return yield* client.Suggest(request);
}, Effect.scoped);

const restartServer = Effect.fn("restartServer")(function* restartServer(dataDirectory: string) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  yield* Effect.ignore(fs.remove(path.join(dataDirectory, ENDPOINT_FILE)));
  yield* startServer(dataDirectory);
  return NO_SUGGESTIONS;
});

const askServer = Effect.fn("askServer")(function* askServer(
  dataDirectory: string,
  request: Readonly<{ directory: string; prompt: string }>,
) {
  const found = yield* suggestOnce(dataDirectory, request).pipe(
    Effect.timeoutOption(ANSWER_LIMIT),
    Effect.catch(() => Effect.asSome(restartServer(dataDirectory))),
  );
  return Option.getOrElse(found, () => NO_SUGGESTIONS);
});

/** @internal */
export const ask = Effect.fn("ask")(function* ask(dataDirectory: string, stdin: string) {
  const path = yield* Path.Path;
  const input = yield* decodeInput(stdin);
  const endpointFile = path.join(dataDirectory, ENDPOINT_FILE);
  const alive = yield* youngerThan(endpointFile, Duration.sum(IDLE_LIMIT, START_GRACE));
  if (!alive) {
    yield* startServer(dataDirectory);
    return Option.none<string>();
  }
  const suggestions = yield* askServer(dataDirectory, {
    directory: input.cwd,
    prompt: input.prompt,
  });
  return yield* answer(suggestions);
});
