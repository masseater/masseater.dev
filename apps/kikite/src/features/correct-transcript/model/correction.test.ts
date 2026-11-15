import { expect, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { AtomRegistry } from "effect/reactivity";
import { vi } from "vite-plus/test";

import { entriesAtom, heardAtom } from "#/entities/interview";
import type { Entry } from "#/entities/interview";
import type { Input } from "#/entities/interview/index.test.support";
import { read, write } from "#/shared/lib/registry";

import { correct } from "./correction.ts";

const ORIGIN = "https://kikite.test";
const AT = 1000;
const FIRST = 0;
const SECOND = 1;

const fakeServer = HttpClient.make((request) =>
  Effect.sync(() =>
    HttpClientResponse.fromWeb(
      request,
      Response.json({ lines: [{ id: FIRST, text: "右に文字起こしが出る" }] }),
    ),
  ),
);

const speech = (id: number, text: string, by: Input): Entry => ({
  kind: "speech",
  id,
  at: AT,
  text,
  by,
});

layer(Layer.merge(AtomRegistry.layer, Layer.succeed(HttpClient.HttpClient, fakeServer)))(
  "correct",
  (it) => {
    it.effect("replaces misheard voice lines and keeps what was heard", () =>
      Effect.gen(function* test() {
        vi.stubGlobal("location", { origin: ORIGIN });
        yield* write(entriesAtom, [
          speech(FIRST, "右にオゾンコシが出る", "voice"),
          speech(SECOND, "手で打った", "typed"),
        ]);
        yield* correct();
        const entries = yield* read(entriesAtom);
        expect(entries).toStrictEqual([
          { ...speech(FIRST, "右に文字起こしが出る", "voice"), raw: "右にオゾンコシが出る" },
          speech(SECOND, "手で打った", "typed"),
        ]);
        const heard = yield* read(heardAtom);
        expect(heard.correctedThrough).toBe(FIRST);
        vi.unstubAllGlobals();
      }),
    );
  },
);
