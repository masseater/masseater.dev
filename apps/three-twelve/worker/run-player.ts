import { Effect, Option, Schedule, Schema } from "effect";

import { PLAYER_ENTRYPOINT, PLAYER_IMAGE } from "#config";
import { Outcomes } from "#outcome";

import { PlayerFailed, playerFailed } from "./player-failed.ts";

const IDLE = ["sleep", "infinity"];
const PROBE = ["true"];
const STARTUP = { schedule: Schedule.spaced("1 second"), times: 90 } as const;
const EXIT_OK = 0;

const decoder = new TextDecoder();

type PlayRequest = Readonly<{ token: string; startAt: number; audio: ReadableStream }>;

const start = Effect.fn("three-twelve.startContainer")(function* start(container: Container) {
  if (container.running) {
    yield* Effect.promise(() => container.destroy());
  }
  const image = yield* Effect.fromOption(
    Option.fromUndefinedOr(container.images[PLAYER_IMAGE]),
    () => PlayerFailed.make({ message: `image ${PLAYER_IMAGE} is not bound` }),
  );
  container.start({ image, entrypoint: IDLE, enableInternet: true, instance: "basic" });
  yield* Effect.tryPromise({ try: () => container.exec(PROBE), catch: playerFailed }).pipe(
    Effect.flatMap((probe) => Effect.promise(() => probe.exitCode)),
    Effect.retry(STARTUP),
  );
  return container;
});

const execute = Effect.fn("three-twelve.execPlayer")(function* execute(
  container: Container,
  request: PlayRequest,
) {
  const process = yield* Effect.tryPromise({
    try: () =>
      container.exec([...PLAYER_ENTRYPOINT], {
        env: { DISCORD_BOT_TOKEN: request.token, START_AT: String(request.startAt) },
        stdin: request.audio,
        stdout: "pipe",
        stderr: "pipe",
      }),
    catch: playerFailed,
  });
  const output = yield* Effect.tryPromise({ try: () => process.output(), catch: playerFailed });
  const log = decoder.decode(output.stderr);
  yield* Effect.logInfo("three-twelve.playerLog").pipe(
    Effect.annotateLogs({ exitCode: output.exitCode, log }),
  );
  if (output.exitCode !== EXIT_OK) {
    return yield* PlayerFailed.make({ message: `player exited with ${output.exitCode}: ${log}` });
  }
  return yield* Schema.decodeEffect(Schema.fromJsonString(Outcomes))(
    decoder.decode(output.stdout),
  ).pipe(Effect.mapError(playerFailed));
});

const runPlayer = Effect.fn("three-twelve.runPlayer")(function* runPlayer(
  container: Container,
  request: PlayRequest,
) {
  return yield* Effect.acquireUseRelease(
    start(container),
    (running) => execute(running, request),
    (running) => Effect.promise(() => running.destroy()),
  );
});

export { runPlayer };
export type { PlayRequest };
