import { CONVERSATION_KINDS } from "@masseater.dev/watashi-protocol";
import { Console, Effect, Option, Path, Stdio, Stream } from "effect";
import type { PlatformError } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { authorized } from "#/features/authenticate/index.ts";
import { maskWith, detectorOf, pushSession, summaryOf } from "#/features/push-session/index.ts";
import { asWatashi } from "#/shared/api/index.ts";
import { settings } from "#/shared/config/index.ts";

/** @internal */
export const readStdin: Effect.Effect<string, PlatformError.PlatformError, Stdio.Stdio> =
  Effect.service(Stdio.Stdio).pipe(
    Effect.flatMap((stdio) => stdio.stdin.pipe(Stream.decodeText, Stream.mkString)),
  );

const pushCommand = Command.make(
  "push",
  {
    kind: Flag.Literals("kind", CONVERSATION_KINDS),
    session: Flag.String("session"),
    cwd: Flag.String("cwd").pipe(Flag.optional),
    transcript: Argument.String("transcript"),
  },
  ({ kind, session, cwd, transcript }) =>
    Effect.gen(function* push() {
      const current = yield* settings;
      const authorization = yield* authorized(current);
      const path = yield* Path.Path;
      const request = {
        kind,
        session,
        transcript: path.resolve(transcript),
        cwd: Option.getOrElse(cwd, () => path.resolve(".")),
      };
      const results = yield* asWatashi({ url: current.url, authorization })(
        pushSession(current)(request),
      );
      yield* Console.log(summaryOf(results));
    }),
).pipe(Command.withDescription("会話履歴の増えた行を、秘密を伏せてから送る"));

/** @internal */
export const conversationCommand = Command.make("conversation").pipe(
  Command.withDescription("会話履歴を扱う"),
  Command.withSubcommands([pushCommand]),
);

/** @internal */
export const maskCommand = Command.make("mask", {}, () =>
  Effect.gen(function* mask() {
    const current = yield* settings;
    const detect = yield* detectorOf(current);
    const input = yield* readStdin;
    const masked = yield* maskWith(detect)(input);
    const stdio = yield* Stdio.Stdio;
    yield* Stream.make(masked.text).pipe(Stream.encodeText, Stream.run(stdio.stdout()));
  }).pipe(Effect.scoped),
).pipe(Command.withDescription("標準入力の JSONL の秘密を伏せて標準出力に書く"));
