import { Effect, MutableRef, Option, Predicate, Record as Rec, Schema } from "effect";
import { constVoid } from "effect/Function";

import { PLAYER_IMAGE } from "#config";
import { Outcomes } from "#outcome";

import type { AudioBucket } from "./perform.ts";
import type { PlayerStorage } from "./player-state.ts";
import type { PlayerContainer } from "./run-player.ts";

type PlayerProcess = Awaited<ReturnType<PlayerContainer["exec"]>>;

type Scene = Readonly<{
  stage: Readonly<{ storage: PlayerStorage; container: PlayerContainer }>;
  plays: () => number;
}>;

const EXIT_OK = 0;
const NO_PLAYS = 0;
const PID = 1;

const OUTCOMES = [{ status: "empty", guildId: "1", guildName: "作業鯖" }] as const;

const encoder = new TextEncoder();

const encodeOutcomes = Schema.encodeEffect(Schema.fromJsonString(Outcomes));

const exited = (stdout: string): PlayerProcess => ({
  stdin: Option.getOrNull(Option.none<WritableStream>()),
  stdout: Option.getOrNull(Option.none<ReadableStream>()),
  stderr: Option.getOrNull(Option.none<ReadableStream>()),
  pid: PID,
  isPty: false,
  exitCode: Promise.resolve(EXIT_OK),
  output: () =>
    Promise.resolve({
      stdout: encoder.encode(stdout).buffer,
      stderr: encoder.encode("").buffer,
      exitCode: EXIT_OK,
    }),
  kill: constVoid,
  resize: constVoid,
});

const storageWith = (
  entries: Readonly<Record<string, unknown>>,
): Readonly<{ storage: PlayerStorage; alarmAt: () => Option.Option<number> }> => {
  const stored = new Map(Rec.toEntries(entries));
  const alarm = MutableRef.make(Option.none<number>());
  return {
    storage: {
      get: (key) => Promise.resolve(stored.get(key)),
      put: (key, value) => {
        stored.set(key, value);
        return Promise.resolve();
      },
      setAlarm: (scheduledTime) => {
        MutableRef.set(alarm, Option.some(scheduledTime));
        return Promise.resolve();
      },
    },
    alarmAt: () => MutableRef.get(alarm),
  };
};

const sceneAt = (startAt: number): Scene => {
  const plays = MutableRef.make(NO_PLAYS);
  const running = MutableRef.make(false);
  const { storage } = storageWith({ token: "bot-token", startAt });
  return {
    stage: {
      storage,
      container: {
        get running() {
          return MutableRef.get(running);
        },
        images: { [PLAYER_IMAGE]: "player:test" },
        start: () => {
          MutableRef.set(running, true);
        },
        destroy: () => {
          MutableRef.set(running, false);
          return Promise.resolve();
        },
        exec: (_command, options) => {
          if (Predicate.isNotUndefined(options)) {
            MutableRef.increment(plays);
          }
          return Effect.runPromise(encodeOutcomes(OUTCOMES).pipe(Effect.map(exited)));
        },
      },
    },
    plays: () => MutableRef.get(plays),
  };
};

const sceneWithBrokenContainer = (startAt: number): Scene => {
  const scene = sceneAt(startAt);
  return {
    stage: {
      storage: scene.stage.storage,
      container: {
        ...scene.stage.container,
        get running(): boolean {
          throw new Error("the container is gone");
        },
      },
    },
    plays: scene.plays,
  };
};

const audio: AudioBucket = { get: () => Promise.resolve({ body: new ReadableStream() }) };

const audioRejecting = (reason: string): AudioBucket => ({
  get: () => Promise.reject(new Error(reason)),
});

export { OUTCOMES, audio, audioRejecting, sceneAt, sceneWithBrokenContainer, storageWith };
export type { Scene };
