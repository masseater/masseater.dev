import { describe, expect, it } from "@effect/vitest";
import { Effect, MutableRef, Option, Schema } from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { ResearchAsk, ResearchRequest, SessionRecord } from "#protocol";
import type { RecordedSession } from "#protocol";

import { closeDatabase, resetDatabase } from "./d1.test.support.ts";
import { researched } from "./research-memory.ts";
import { sessionRoutes } from "./session-routes.ts";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

const ORIGIN = "https://kikite.test";
const ID = "0b6f7c1e-2f3a-4d5b-8c9d-0e1f2a3b4c5d";
const STARTED = 1000;
const OK = 200;
const BAD_REQUEST = 400;

const PAST: RecordedSession = {
  startedAt: STARTED,
  entries: [],
  progress: [],
  withdrawn: 0,
  summary: Option.some({
    theme: "3D 酔い",
    points: ["VR で酔う", "エルデンリングで酔う"],
    open: [],
    next: [],
  }),
};

const ASK = {
  summary: { theme: "メモの置き場", points: ["散らかる"], open: [], next: [] },
  recent: "本人: メモが散らかっている",
  known: [],
};

const encodeRecord = Schema.encodeEffect(Schema.fromJsonString(SessionRecord));
const encodeAsk = Schema.encodeEffect(Schema.fromJsonString(ResearchAsk));
const decodeForwarded = Schema.decodeUnknownEffect(Schema.fromJsonString(ResearchRequest));

const forwarded = MutableRef.make(Option.none<Request>());

const forward = (next: Request): Promise<Response> => {
  MutableRef.set(forwarded, Option.some(next));
  return Promise.resolve(Response.json({ leads: [] }));
};

const forwardedText = Effect.suspend(() => Effect.fromOption(MutableRef.get(forwarded))).pipe(
  Effect.flatMap((next) => Effect.promise(() => next.text())),
);

const ask = (body: string): Effect.Effect<Response> =>
  researched(forward)(new Request(`${ORIGIN}/api/research`, { method: "POST", body }));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

describe("research memory", () => {
  it.effect("hands the researcher what past sessions were about", () =>
    Effect.gen(function* test() {
      const body = yield* encodeRecord(PAST);
      yield* sessionRoutes(new Request(`${ORIGIN}/api/sessions/${ID}`, { method: "PUT", body }));
      const question = yield* encodeAsk(ASK);
      const response = yield* ask(question);
      expect(response.status).toBe(OK);
      const text = yield* forwardedText;
      const sent = yield* decodeForwarded(text);
      expect(sent.memory).toStrictEqual(["3D 酔い: VR で酔う、エルデンリングで酔う"]);
    }),
  );

  it.effect("refuses a body that is not a research request", () =>
    Effect.gen(function* test() {
      const response = yield* ask('{"recent":1}');
      expect(response.status).toBe(BAD_REQUEST);
    }),
  );
});
