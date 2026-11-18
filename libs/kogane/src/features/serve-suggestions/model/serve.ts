import { ENDPOINT_FILE } from "@masseater.dev/local-server";
import { EndpointDirectory, transportLayer } from "@masseater.dev/local-server/node";
import { Clock, DateTime, Duration, Effect, FileSystem, Layer, Path, Ref, Schedule } from "effect";
import type { Rpc, RpcGroup } from "effect/rpc";
import { RpcServer } from "effect/rpc";

import { KoganeRpcs } from "#/shared/api/rpcs.ts";
import { IDLE_LIMIT } from "#/shared/config/index.ts";
import { embedderLayer } from "#/shared/lib/embedder.ts";

import { WorkspaceIndex, workspaceIndexLayer } from "./workspace-index.ts";

const MODEL_DIRECTORY = "models";
const IDLE_CHECK_MINUTES = 1;
const IDLE_CHECK = Duration.minutes(IDLE_CHECK_MINUTES);

const touchWith = (
  touched: Ref.Ref<number>,
  endpointFile: string,
): Effect.Effect<void, never, FileSystem.FileSystem> =>
  Effect.gen(function* touch() {
    const fs = yield* FileSystem.FileSystem;
    const now = yield* DateTime.now;
    yield* Ref.set(touched, DateTime.toEpochMillis(now));
    const at = DateTime.toDate(now);
    yield* Effect.ignore(fs.utimes(endpointFile, at, at));
  });

const handlersLayer = (
  touched: Ref.Ref<number>,
  endpointFile: string,
): Layer.Layer<
  Rpc.ToHandler<RpcGroup.Rpcs<typeof KoganeRpcs>>,
  never,
  WorkspaceIndex | FileSystem.FileSystem
> =>
  KoganeRpcs.toLayer(
    Effect.gen(function* handlers() {
      const index = yield* WorkspaceIndex;
      const services = yield* Effect.context<FileSystem.FileSystem>();
      const touch = Effect.provideContext(touchWith(touched, endpointFile), services);
      return KoganeRpcs.of({
        Suggest: ({ directory, prompt }) =>
          touch.pipe(
            Effect.andThen(Effect.uninterruptible(index.suggest(directory, prompt))),
            Effect.orElseSucceed(() => []),
          ),
      });
    }),
  );

const isIdle = (touched: Ref.Ref<number>): Effect.Effect<boolean> =>
  Effect.gen(function* idleSince() {
    const last = yield* Ref.get(touched);
    const now = yield* Clock.currentTimeMillis;
    return now - last >= Duration.toMillis(IDLE_LIMIT);
  });

const untilIdle = (touched: Ref.Ref<number>): Effect.Effect<void> =>
  isIdle(touched).pipe(
    Effect.repeat({ schedule: Schedule.spaced(IDLE_CHECK), until: (idle) => idle }),
    Effect.asVoid,
  );

/** @internal */
export const serve = Effect.fn("serve")(function* serve(dataDirectory: string) {
  const path = yield* Path.Path;
  const started = yield* Clock.currentTimeMillis;
  const touched = yield* Ref.make(started);
  const endpointFile = path.join(dataDirectory, ENDPOINT_FILE);
  const embedder = embedderLayer(path.join(dataDirectory, MODEL_DIRECTORY));
  const indexLayer = Layer.provide(workspaceIndexLayer, embedder);
  const directoryLayer = Layer.succeed(EndpointDirectory, dataDirectory);
  const transport = Layer.provide(transportLayer, directoryLayer);
  const server = RpcServer.layer(KoganeRpcs).pipe(
    Layer.provide(handlersLayer(touched, endpointFile)),
    Layer.provide(indexLayer),
    Layer.provide(transport),
  );
  yield* Effect.raceFirst(Layer.launch(server), untilIdle(touched));
});
