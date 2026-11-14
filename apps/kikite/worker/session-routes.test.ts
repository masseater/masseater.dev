import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { SessionListing, SessionRecord } from "#protocol";
import type { RecordedSession } from "#protocol";

import { closeDatabase, resetDatabase } from "./d1.test.support.ts";
import { sessionRoutes } from "./session-routes.ts";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

const ORIGIN = "https://kikite.test";
const ID = "0b6f7c1e-2f3a-4d5b-8c9d-0e1f2a3b4c5d";
const OK = 200;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const STARTED = 1000;
const SPOKEN = 2000;
const FIRST = 0;
const SECOND = 1;
const TWO_ENTRIES = 2;

const encodeRecord = Schema.encodeEffect(Schema.fromJsonString(SessionRecord));
const decodeRecord = Schema.decodeUnknownEffect(Schema.fromJsonString(SessionRecord));
const decodeListing = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Schema.Array(SessionListing)),
);

const recordWith = (texts: readonly string[], theme: Option.Option<string>): RecordedSession => ({
  startedAt: STARTED,
  entries: pipe(
    texts,
    Arr.map((text, index) => ({
      kind: "speech" as const,
      id: index,
      at: SPOKEN,
      text,
      by: "voice" as const,
    })),
  ),
  progress: [],
  withdrawn: 0,
  summary: pipe(
    theme,
    Option.map((current) => ({ theme: current, points: [], open: [], next: [] })),
  ),
});

const call = (path: string): Effect.Effect<Response> =>
  sessionRoutes(new Request(`${ORIGIN}${path}`));

const put = (id: string, body: string): Effect.Effect<Response> =>
  sessionRoutes(new Request(`${ORIGIN}/api/sessions/${id}`, { method: "PUT", body }));

const save = (record: RecordedSession): Effect.Effect<Response, Schema.SchemaError> =>
  encodeRecord(record).pipe(Effect.flatMap((body) => put(ID, body)));

const textOf = (response: Response): Effect.Effect<string> => Effect.promise(() => response.text());

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

describe("sessions", () => {
  it.effect("keeps the latest copy of a session under its id", () =>
    Effect.gen(function* test() {
      yield* save(recordWith(["最初"], Option.none()));
      const saved = yield* save(recordWith(["最初", "次"], Option.some("聞き手")));
      expect(saved.status).toBe(OK);
      const stored = yield* call(`/api/sessions/${ID}`).pipe(
        Effect.flatMap(textOf),
        Effect.flatMap(decodeRecord),
      );
      const ids = pipe(
        stored.entries,
        Arr.map(({ id }) => id),
      );
      expect(ids).toEqual([FIRST, SECOND]);
      const listed = yield* call("/api/sessions").pipe(
        Effect.flatMap(textOf),
        Effect.flatMap(decodeListing),
      );
      const rows = pipe(
        listed,
        Arr.map(({ id, theme, entries }) => ({ id, theme, entries })),
      );
      expect(rows).toEqual([{ id: ID, theme: "聞き手", entries: TWO_ENTRIES }]);
    }),
  );

  it.effect("refuses a body that is not a session record", () =>
    Effect.gen(function* test() {
      const refused = yield* put(ID, '{"entries":[{"kind":"chapter"}]}');
      expect(refused.status).toBe(BAD_REQUEST);
    }),
  );

  it.effect("refuses an id that is not a uuid", () =>
    Effect.gen(function* test() {
      const refused = yield* call("/api/sessions/..%2Fetc");
      expect(refused.status).toBe(BAD_REQUEST);
    }),
  );

  it.effect("answers not found for a session that was never saved", () =>
    Effect.gen(function* test() {
      const missing = yield* call(`/api/sessions/${ID}`);
      expect(missing.status).toBe(NOT_FOUND);
    }),
  );
});
