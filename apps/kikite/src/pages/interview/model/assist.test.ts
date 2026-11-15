import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, MutableRef, Option, String as Str, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { AtomRegistry } from "effect/reactivity";
import { vi } from "vite-plus/test";

import { entriesAtom, heardAtom, leadsAtom, summaryAtom } from "#/entities/interview";
import type { Entry } from "#/entities/interview";
import type { Input } from "#/entities/interview/index.test.support";
import { read, write } from "#/shared/lib/registry";

import { correct } from "./correction.ts";
import { research } from "./research.ts";

const ORIGIN = "https://kikite.test";
const AT = 1000;
const FIRST = 0;
const SECOND = 1;
const LEAD = { topic: "VR 酔い対策", detail: "視野を狭める", source: "https://example.com" };

const sent = MutableRef.make<readonly string[]>([]);

const answerTo = (url: string): Response => {
  if (Str.endsWith("/api/correction")(url)) {
    return Response.json({ lines: [{ id: FIRST, text: "右に文字起こしが出る" }] });
  }
  return Response.json({ leads: [LEAD] });
};

const answered = (
  request: HttpClientRequest.HttpClientRequest,
): HttpClientResponse.HttpClientResponse => {
  MutableRef.update(sent, Arr.append(request.url));
  return HttpClientResponse.fromWeb(request, answerTo(request.url));
};

const fakeServer = HttpClient.make((request) => Effect.sync(() => answered(request)));

const speech = (id: number, text: string, by: Input): Entry => ({
  kind: "speech",
  id,
  at: AT,
  text,
  by,
});

const SUMMARY = { theme: "3D 酔い", points: ["エルデンリングで酔う"], open: [], next: [] };

layer(Layer.merge(AtomRegistry.layer, Layer.succeed(HttpClient.HttpClient, fakeServer)))(
  "assist",
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

    it.effect("researches a summary once and keeps the leads it found", () =>
      Effect.gen(function* test() {
        vi.stubGlobal("location", { origin: ORIGIN });
        MutableRef.set(sent, []);
        yield* write(summaryAtom, { status: "ready", summary: Option.some(SUMMARY) });
        yield* research();
        yield* research();
        const leads = yield* read(leadsAtom);
        expect(leads).toStrictEqual([LEAD]);
        const researched = pipe(MutableRef.get(sent), Arr.filter(Str.endsWith("/api/research")));
        expect(researched).toHaveLength(SECOND);
        vi.unstubAllGlobals();
      }),
    );
  },
);
