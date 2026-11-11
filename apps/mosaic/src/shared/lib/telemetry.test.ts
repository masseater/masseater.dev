import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, Predicate, pipe } from "effect";
import { afterEach, expect, vi } from "vite-plus/test";

const ACCEPTED = 202;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

const recordKeepalives = (): readonly boolean[] => {
  const keepalives: boolean[] = [];
  vi.stubGlobal("document", {});
  vi.stubGlobal("location", new URL("https://masseater.dev/mosaic/miku"));
  vi.stubGlobal("fetch", (_input: unknown, init: unknown) => {
    keepalives.push(Predicate.hasProperty(init, "keepalive") && init.keepalive === true);
    return Promise.resolve(new Response("", { status: ACCEPTED }));
  });
  return keepalives;
};

layer(Layer.empty)("ページを離れるときのスパンの送信", (it) => {
  it.effect("ページを離れるときのスパンは keepalive を付けて送り、ページが閉じても送り切る", () =>
    Effect.gen(function* sendsWithKeepalive() {
      const keepalives = recordKeepalives();
      const { flushTraces, runtime } = yield* Effect.promise(() => import("./telemetry"));
      yield* Effect.promise(() =>
        runtime.runPromise(
          Effect.void.pipe(Effect.withSpan("mosaic.page.hide"), Effect.andThen(flushTraces)),
        ),
      );
      expect(Arr.isReadonlyArrayNonEmpty(keepalives)).toBe(true);
      expect(keepalives).toStrictEqual(
        pipe(
          keepalives,
          Arr.map(() => true),
        ),
      );
    }),
  );
});
