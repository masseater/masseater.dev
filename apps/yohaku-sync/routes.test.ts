import { describe, expect, it } from "@effect/vitest";
import { Changes, Pushed, SYNC_ORIGIN } from "@masseater.dev/yohaku-protocol/sync";
import type { SyncDocument } from "@masseater.dev/yohaku-protocol/sync";
import { Array, Effect, Option, Schema, pipe } from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { closeDatabase, resetDatabase } from "./d1.test.support.ts";
import { routed } from "./routes.ts";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

const OK = 200;
const BAD_REQUEST = 400;
const EARLY = 100;
const LATE = 200;
const START = 0;

const encodePushed = Schema.encodeEffect(Schema.fromJsonString(Pushed));
const decodeChanges = Schema.decodeUnknownEffect(Schema.fromJsonString(Changes));

const manuscript = (body: string, updatedAt: number): typeof SyncDocument.Type => ({
  kind: "manuscript",
  id: "m1",
  updatedAt,
  deleted: false,
  body,
});

const put = (body: string): Effect.Effect<Response> =>
  routed(new Request(`${SYNC_ORIGIN}/api/documents`, { method: "PUT", body }));

const push = (
  documents: readonly (typeof SyncDocument.Type)[],
): Effect.Effect<Response, Schema.SchemaError> =>
  encodePushed({ documents }).pipe(Effect.flatMap(put));

const changesAfter = (after: number): Effect.Effect<typeof Changes.Type, Schema.SchemaError> =>
  routed(new Request(`${SYNC_ORIGIN}/api/changes?after=${after.toString()}`)).pipe(
    Effect.flatMap((response) => Effect.promise(() => response.text())),
    Effect.flatMap(decodeChanges),
  );

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

const fieldOf =
  (field: "id" | "body") =>
  ({ documents }: typeof Changes.Type): readonly string[] =>
    pipe(
      documents,
      Array.map((document) => document[field]),
    );

const lastRevision = ({ documents }: typeof Changes.Type): number =>
  pipe(
    documents,
    Array.map(({ revision }) => revision),
    Array.last,
    Option.getOrElse(() => START),
  );

describe("sync", () => {
  it.effect("hands out pushed documents in the order they arrive", () =>
    Effect.gen(function* test() {
      const pushed = yield* push([
        manuscript("first", EARLY),
        { ...manuscript("memo", EARLY), kind: "source", id: "s1" },
      ]);
      expect(pushed.status).toBe(OK);
      const changes = yield* changesAfter(START);
      expect(fieldOf("id")(changes)).toEqual(["m1", "s1"]);
      expect(changes.more).toBe(false);
    }),
  );

  it.effect("keeps the newer copy when an older one arrives later", () =>
    Effect.gen(function* test() {
      yield* push([manuscript("newer", LATE)]);
      yield* push([manuscript("older", EARLY)]);
      const changes = yield* changesAfter(START);
      expect(fieldOf("body")(changes)).toEqual(["newer"]);
    }),
  );

  it.effect("hands a replaced document out again after the revision already seen", () =>
    Effect.gen(function* test() {
      yield* push([manuscript("first", EARLY)]);
      const seen = yield* changesAfter(START);
      yield* push([manuscript("second", LATE)]);
      const changes = yield* changesAfter(lastRevision(seen));
      expect(fieldOf("body")(changes)).toEqual(["second"]);
    }),
  );

  it.effect("refuses a body that is not a list of documents", () =>
    Effect.gen(function* test() {
      const refused = yield* put('{"documents":[{"kind":"chapter"}]}');
      expect(refused.status).toBe(BAD_REQUEST);
    }),
  );
});
