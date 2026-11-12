import { DateTime, Effect, FileSystem, Option, Path, Schema } from "effect";
import type { PlatformError, Stdio } from "effect";
import { Command } from "effect/cli";

import { asWatashi } from "./api.ts";
import { authorization } from "./auth.ts";
import { readStdin } from "./conversation-commands.ts";
import { lock } from "./lock.ts";
import type { PushError } from "./push.ts";
import type { Services } from "./services.ts";
import { pushSession } from "./session.ts";
import { settings } from "./settings.ts";
import type { Settings } from "./settings.ts";

const EMPTY = Effect.succeed("");

const Cwd = Schema.String.pipe(Schema.withDecodingDefaultKey(EMPTY));

const StopInput = Schema.fromJsonString(
  Schema.Struct({ session_id: Schema.String, transcript_path: Schema.String, cwd: Cwd }),
);

type Stop = typeof StopInput.Type;

const logHookError = (
  failure: Readonly<{ home: string; message: string }>,
): Effect.Effect<void, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* log() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const now = yield* DateTime.now;
    yield* fs.makeDirectory(failure.home, { recursive: true });
    const line = `${DateTime.formatIso(now)} ${failure.message}\n`;
    yield* fs.writeFileString(path.join(failure.home, "hook.log"), line, { flag: "a" });
  }).pipe(Effect.ignore);

const send = (current: Settings, input: Stop): Effect.Effect<void, PushError, Services> =>
  Effect.gen(function* sendSession() {
    const token = yield* authorization(current);
    if (Option.isNone(token)) {
      return;
    }
    const held = yield* lock({ home: current.home, name: `claude-code-${input.session_id}` });
    if (!held) {
      return;
    }
    const request = {
      kind: "claude-code" as const,
      session: input.session_id,
      transcript: input.transcript_path,
      cwd: input.cwd,
    };
    yield* asWatashi({ url: current.url, authorization: token.value })(
      pushSession(current)(request),
    );
  }).pipe(Effect.scoped);

const decodeStop = Schema.decodeEffect(StopInput);

const stop = (
  current: Settings,
): Effect.Effect<
  void,
  PushError | PlatformError.PlatformError | Schema.SchemaError,
  Services | Stdio.Stdio
> =>
  Effect.gen(function* stopHook() {
    if (!current.send) {
      return;
    }
    const input = yield* readStdin.pipe(Effect.flatMap(decodeStop));
    yield* send(current, input);
  });

const stopCommand = Command.make("stop", {}, () =>
  Effect.gen(function* runStop() {
    const current = yield* settings;
    yield* stop(current).pipe(
      Effect.catchCause((cause) => logHookError({ home: current.home, message: String(cause) })),
    );
  }),
).pipe(
  Command.withDescription(
    "Claude Code の Stop フックとして動く（WATASHI_SEND_CONVERSATIONS=1 の環境だけ送る）",
  ),
);

const hookCommand = Command.make("hook").pipe(
  Command.withDescription("Claude Code のフックとして動く"),
  Command.withSubcommands([stopCommand]),
);

/** @internal */
export { hookCommand };
