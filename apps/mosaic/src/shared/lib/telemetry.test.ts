import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Predicate, pipe } from "effect";
import { afterEach, expect, vi } from "vite-plus/test";

import { browserTelemetry, flushTraces } from "./telemetry";

const ACCEPTED = 202;

afterEach(() => {
  vi.unstubAllGlobals();
});

const recordKeepalives = (): readonly boolean[] => {
  const keepalives: boolean[] = [];
  vi.stubGlobal("location", new URL("https://masseater.dev/mosaic/miku"));
  vi.stubGlobal("fetch", (_input: unknown, init: unknown) => {
    keepalives.push(Predicate.hasProperty(init, "keepalive") && init.keepalive === true);
    return Promise.resolve(new Response("", { status: ACCEPTED }));
  });
  return keepalives;
};

layer(browserTelemetry)("ページを離れるときのスパンの送信", (it) => {
  it.effect("keepalive を付けて送り、ページが閉じても送り切る", () =>
    Effect.gen(function* sendsWithKeepalive() {
      const keepalives = recordKeepalives();
      yield* Effect.void.pipe(Effect.withSpan("mosaic.page.hide"));
      yield* flushTraces;
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
