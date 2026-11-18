import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, ManagedRuntime, MutableRef, Predicate, pipe } from "effect";
import { FetchHttpClient } from "effect/http";
import { afterEach, expect, vi } from "vite-plus/test";

import { browserTelemetry, flushTraces } from "./telemetry.ts";

const ACCEPTED = 202;

afterEach(() => {
  vi.unstubAllGlobals();
});

const keepaliveRecorder = (): Readonly<{
  keepalives: MutableRef.MutableRef<readonly boolean[]>;
  fetch: typeof globalThis.fetch;
}> => {
  const keepalives = MutableRef.make<readonly boolean[]>([]);
  const fetch: typeof globalThis.fetch = (_input, init) => {
    const keepalive = Predicate.hasProperty(init, "keepalive") && init.keepalive === true;
    MutableRef.update(keepalives, Arr.append(keepalive));
    return Promise.resolve(new Response("", { status: ACCEPTED }));
  };
  return { keepalives, fetch };
};

layer(Layer.empty)("ページを離れるときのスパンの送信", (it) => {
  it.effect("ページを離れるときのスパンは keepalive を付けて送り、ページが閉じても送り切る", () =>
    Effect.gen(function* sendsWithKeepalive() {
      const { keepalives, fetch } = keepaliveRecorder();
      vi.stubGlobal("location", new URL("https://masseater.dev/mosaic/miku"));
      const recording = Layer.succeed(FetchHttpClient.Fetch, fetch);
      const runtime = ManagedRuntime.make(browserTelemetry.pipe(Layer.provide(recording)));
      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.void.pipe(Effect.withSpan("mosaic.page.hide"), Effect.andThen(flushTraces)),
        ),
      );
      yield* Effect.promise(() => runtime.dispose());
      const sent = MutableRef.get(keepalives);
      expect(Arr.isReadonlyArrayNonEmpty(sent)).toBe(true);
      expect(sent).toStrictEqual(
        pipe(
          sent,
          Arr.map(() => true),
        ),
      );
    }),
  );
});
