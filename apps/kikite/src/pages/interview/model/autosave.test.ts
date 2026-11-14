import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, MutableRef } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { AtomRegistry } from "effect/reactivity";
import { TestClock } from "effect/testing";
import { vi } from "vite-plus/test";

import { entriesAtom, recordingAtom } from "./atoms.ts";
import type { Entry } from "./atoms.ts";
import { autosaving } from "./autosave.ts";
import { modify, write } from "./registry.ts";

const ID = "0b6f7c1e-2f3a-4d5b-8c9d-0e1f2a3b4c5d";
const ORIGIN = "https://kikite.test";
const INTERVAL = "3 seconds";
const STARTED = 1000;
const FIRST = 0;
const SECOND = 1;
const TWO_UPLOADS = 2;
const UPLOAD = `PUT ${ORIGIN}/api/sessions/${ID}`;

const sent = MutableRef.make<readonly string[]>([]);

const speech = (id: number, text: string): Entry => ({
  kind: "speech",
  id,
  at: STARTED,
  text,
  by: "voice",
});

const answered = (
  request: HttpClientRequest.HttpClientRequest,
): HttpClientResponse.HttpClientResponse => {
  MutableRef.update(sent, Arr.append(`${request.method} ${request.url}`));
  return HttpClientResponse.fromWeb(request, Response.json({ id: ID }));
};

const fakeServer = HttpClient.make((request) => Effect.sync(() => answered(request)));

const FIRST_SPEECH = speech(FIRST, "最初");
const SECOND_SPEECH = speech(SECOND, "次");

const waitInterval = Effect.yieldNow.pipe(Effect.andThen(TestClock.adjust(INTERVAL)));

const uploadsAfter = (
  change: Effect.Effect<void, never, AtomRegistry.AtomRegistry>,
): Effect.Effect<readonly string[], never, AtomRegistry.AtomRegistry> =>
  change.pipe(
    Effect.andThen(waitInterval),
    Effect.andThen(waitInterval),
    Effect.andThen(Effect.sync(() => MutableRef.get(sent))),
  );

layer(Layer.merge(AtomRegistry.layer, Layer.succeed(HttpClient.HttpClient, fakeServer)))(
  "autosaving",
  (it) => {
    it.effect("uploads a session once per change and never an empty one", () =>
      Effect.gen(function* test() {
        vi.stubGlobal("location", { origin: ORIGIN });
        yield* write(recordingAtom, { id: ID, startedAt: STARTED });
        yield* Effect.forkScoped(autosaving);
        const beforeSpeech = yield* uploadsAfter(Effect.void);
        expect(beforeSpeech).toEqual([]);
        const afterSpeech = yield* uploadsAfter(write(entriesAtom, [FIRST_SPEECH]));
        expect(afterSpeech).toEqual([UPLOAD]);
        const afterMore = yield* uploadsAfter(modify(entriesAtom, Arr.append(SECOND_SPEECH)));
        expect(afterMore).toHaveLength(TWO_UPLOADS);
        vi.unstubAllGlobals();
      }).pipe(Effect.scoped),
    );
  },
);
