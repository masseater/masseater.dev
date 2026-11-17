import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { TestClock } from "effect/testing";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { sweep } from "#/features/sweep-entries/index.ts";
import { closeDatabase, objectCount, resetStores } from "#/shared/lib/cloudflare.test.support.ts";

import { blobResponse, found, lookup, store } from "./routes.test.support.ts";

vi.mock("cloudflare:workers", () => import("#/shared/lib/cloudflare.test.support.ts"));

vi.mock("jose", () => import("#/app/token.test.support.ts"));

vi.mock("#/shared/config/limits.ts", () => ({
  SECONDS_PER_DAY: 86_400,
  LIMITS: {
    requestBytes: 4096,
    inlineValueBytes: 16,
    responseBytes: 4096,
    entriesPerKey: 8,
    storedBytes: 250,
    retentionDays: 7,
    uploadsPerDay: 6,
    objectReadsPerDay: 4,
    requestsPerMinute: 1200,
  },
}));

const OK = 200;
const NOT_FOUND = 404;
const TOO_LARGE = 413;
const TOO_MANY = 429;
const VALUE_BYTES = 100;
const UPLOADS_ALLOWED = 6;
const OBJECT_READS_ALLOWED = 4;
const OVERSIZED = 5000;
const FIRST_VERSION = 1;
const STORED = 3;
const KEPT_OBJECTS = 2;
const NO_OBJECTS = 0;
const PAST_RETENTION = "8 days";

const keyOf = (version: number): Uint8Array => new Uint8Array([version]);

const valueOf = (version: number): Uint8Array => new Uint8Array(VALUE_BYTES).fill(version);

const storeVersion = (version: number): Effect.Effect<Response> =>
  store({ key: keyOf(version), value: valueOf(version), blob: Option.none() });

const storeVersions = (count: number): Effect.Effect<readonly Response[]> =>
  Effect.forEach(Arr.range(FIRST_VERSION, count), storeVersion, { concurrency: 1 });

const statusOf = (response: Response): number => response.status;

const dropsTheOldestPastTheStoredBytes = Effect.gen(function* dropsTheOldestPastTheStoredBytes() {
  yield* storeVersions(STORED);
  yield* sweep;
  const oldest = yield* lookup(keyOf(FIRST_VERSION));
  expect(oldest.status).toBe(NOT_FOUND);
  const kept = yield* found(keyOf(STORED));
  const values = pipe(
    kept.entries,
    Arr.map((entry) => entry.value),
  );
  expect(values).toStrictEqual([valueOf(STORED)]);
  expect(objectCount()).toBe(KEPT_OBJECTS);
});

const dropsEntriesPastRetention = Effect.gen(function* dropsEntriesPastRetention() {
  yield* storeVersions(FIRST_VERSION);
  yield* TestClock.adjust(PAST_RETENTION);
  yield* sweep;
  const expired = yield* lookup(keyOf(FIRST_VERSION));
  expect(expired.status).toBe(NOT_FOUND);
  expect(objectCount()).toBe(NO_OBJECTS);
});

const refusesUploadsPastTheDailyCap = Effect.gen(function* refusesUploadsPastTheDailyCap() {
  const responses = yield* storeVersions(UPLOADS_ALLOWED + FIRST_VERSION);
  expect(pipe(responses, Arr.map(statusOf))).toStrictEqual([
    ...Arr.replicate(OK, UPLOADS_ALLOWED),
    TOO_MANY,
  ]);
  yield* TestClock.adjust("1 day");
  const nextDay = yield* storeVersion(FIRST_VERSION);
  expect(nextDay.status).toBe(OK);
});

const stopsReadingObjectsPastTheDailyCap = Effect.gen(
  function* stopsReadingObjectsPastTheDailyCap() {
    yield* store({
      key: keyOf(FIRST_VERSION),
      value: valueOf(FIRST_VERSION),
      blob: Option.some(valueOf(FIRST_VERSION)),
    });
    const reads = yield* Effect.forEach(
      Arr.range(FIRST_VERSION, OBJECT_READS_ALLOWED + FIRST_VERSION),
      () => lookup(keyOf(FIRST_VERSION)),
      { concurrency: 1 },
    );
    expect(pipe(reads, Arr.map(statusOf))).toStrictEqual([
      ...Arr.replicate(OK, OBJECT_READS_ALLOWED),
      NOT_FOUND,
    ]);
    const blob = yield* blobResponse(String(FIRST_VERSION));
    expect(blob.status).toBe(NOT_FOUND);
  },
);

const refusesAnOversizedBody = Effect.gen(function* refusesAnOversizedBody() {
  const refused = yield* store({
    key: keyOf(FIRST_VERSION),
    value: new Uint8Array(OVERSIZED),
    blob: Option.none(),
  });
  expect(refused.status).toBe(TOO_LARGE);
});

beforeEach(() => Effect.runPromise(resetStores));
afterAll(() => Effect.runPromise(closeDatabase));

describe("task cache caps", () => {
  it.effect(
    "drops the oldest entries once the stored bytes pass the cap",
    () => dropsTheOldestPastTheStoredBytes,
  );
  it.effect("drops entries older than the retention period", () => dropsEntriesPastRetention);
  it.effect("refuses uploads beyond the daily cap", () => refusesUploadsPastTheDailyCap);
  it.effect(
    "stops reading stored objects beyond the daily cap",
    () => stopsReadingObjectsPastTheDailyCap,
  );
  it.effect("refuses a request body over the size limit", () => refusesAnOversizedBody);
});
