import { expect, layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, MutableRef, Option, String as Str, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import { AtomRegistry } from "effect/reactivity";
import { vi } from "vite-plus/test";

import { leadsAtom, summaryAtom } from "#/entities/interview/index.ts";
import { read, write } from "#/shared/lib/registry.ts";

import { research } from "./research.ts";

const ORIGIN = "https://kikite.test";
const ONCE = 1;
const LEAD = { topic: "VR 酔い対策", detail: "視野を狭める", source: "https://example.com" };

const sent = MutableRef.make<readonly string[]>([]);

const answered = (
  request: HttpClientRequest.HttpClientRequest,
): HttpClientResponse.HttpClientResponse => {
  MutableRef.update(sent, Arr.append(request.url));
  return HttpClientResponse.fromWeb(request, Response.json({ leads: [LEAD] }));
};

const fakeServer = HttpClient.make((request) => Effect.sync(() => answered(request)));

const SUMMARY = { theme: "3D 酔い", points: ["エルデンリングで酔う"], open: [], next: [] };

layer(Layer.merge(AtomRegistry.layer, Layer.succeed(HttpClient.HttpClient, fakeServer)))(
  "research",
  (it) => {
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
        expect(researched).toHaveLength(ONCE);
        vi.unstubAllGlobals();
      }),
    );
  },
);
