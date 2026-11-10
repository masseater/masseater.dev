import { Clock, Effect, Option, Schedule, Schema } from "effect";

import { PLAYER_ENTRYPOINT, PLAYER_IMAGE, STARTUP } from "#config";
import { Outcomes } from "#outcome";

import { PlayerFailed, playerFailed } from "./player-failed.ts";

const IDLE = ["sleep", "infinity"];
const PROBE = ["true"];
const STARTUP_RETRY = {
  schedule: Schedule.spaced(STARTUP.spacing),
  times: STARTUP.probes,
} as const;
const EXIT_OK = 0;

const decoder = new TextDecoder();

type PlayRequest = Readonly<{ token: string; startAt: number; audio: ReadableStream }>;

type PlayerContainer = Readonly<{
  running: Container["running"];
  images: Readonly<Container["images"]>;
  start: Container["start"];
  destroy: Container["destroy"];
  exec: Container["exec"];
}>;

const destroy = (container: PlayerContainer): Effect.Effect<void, PlayerFailed> =>
  Effect.tryPromise({ try: () => container.destroy(), catch: playerFailed });

const start = Effect.fn("three-twelve.startContainer")(function* start(container: PlayerContainer) {
  if (container.running) {
    yield* destroy(container);
  }
  const image = yield* Effect.fromOption(
    Option.fromUndefinedOr(container.images[PLAYER_IMAGE]),
    () => PlayerFailed.make({ message: `image ${PLAYER_IMAGE} is not bound` }),
  );
  yield* Effect.try({
    try: () => {
      container.start({ image, entrypoint: IDLE, enableInternet: true, instance: "basic" });
    },
    catch: playerFailed,
  });
  yield* Effect.tryPromise({ try: () => container.exec(PROBE), catch: playerFailed }).pipe(
    Effect.flatMap((probe) =>
      Effect.tryPromise({ try: () => probe.exitCode, catch: playerFailed }),
    ),
    Effect.retry(STARTUP_RETRY),
  );
  return container;
});

const execute = Effect.fn("three-twelve.execPlayer")(function* execute(
  container: PlayerContainer,
  request: PlayRequest,
) {
  const readyAt = yield* Clock.currentTimeMillis;
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
  const outcomes = yield* Schema.decodeEffect(Schema.fromJsonString(Outcomes))(
    decoder.decode(output.stdout),
  ).pipe(Effect.mapError(playerFailed));
  return { readyAt, outcomes };
});

const release = (container: PlayerContainer): Effect.Effect<void> =>
  destroy(container).pipe(
    Effect.catchTag("PlayerFailed", (failed) =>
      Effect.logWarning("three-twelve.destroyFailed").pipe(
        Effect.annotateLogs({ reason: failed.message }),
      ),
    ),
  );

const runPlayer = Effect.fn("three-twelve.runPlayer")(function* runPlayer(
  container: PlayerContainer,
  request: PlayRequest,
) {
  return yield* Effect.acquireUseRelease(
    start(container),
    (running) => execute(running, request),
    release,
  );
});

export { runPlayer };
export type { PlayRequest, PlayerContainer };
