import { Array, Deferred, Duration, Effect, Option, Record, String, pipe } from "effect";
import type { LoadingManager } from "three";

import { baseName, managerFor } from "./file-urls.ts";
import { PARSERS, unreadable } from "./parsers.ts";
import type { ModelSource } from "./parsers.ts";
import { ignoreVertexColorsOnTextures } from "./vertex-colors.ts";

const TEXTURE_WAIT = Duration.fromInputUnsafe("15 seconds");

const extensionOf = (pathname: string): string =>
  pipe(
    baseName(pathname),
    String.split("."),
    Array.last,
    Option.getOrElse(() => ""),
  );

const settled = Effect.fn("settled")(function* settled(manager: LoadingManager) {
  const done = yield* Deferred.make<boolean>();
  const finish = (): void => {
    Deferred.doneUnsafe(done, Effect.succeed(true));
  };
  manager.onLoad = finish;
  return done;
});

const loadModel = Effect.fn("loadModel")(function* loadModel(source: ModelSource) {
  const manager = yield* managerFor(source.files);
  const parse = yield* pipe(
    Record.get(PARSERS, extensionOf(source.pathname)),
    Effect.fromOption,
    Effect.mapError(unreadable(source.pathname)),
  );
  const loaded = yield* settled(manager);
  const object = yield* parse(source, manager);
  yield* Deferred.await(loaded).pipe(Effect.timeoutOption(TEXTURE_WAIT));
  ignoreVertexColorsOnTextures(object);
  return object;
});

export { loadModel };
