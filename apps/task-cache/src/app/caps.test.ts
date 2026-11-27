import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { TestClock } from "effect/testing";
import { afterAll, beforeEach } from "vite-plus/test";

import { sweep } from "#/features/sweep-entries/index.ts";
import { Limits } from "#/shared/config/index.ts";
import {
  closeDatabase,
  objectCount,
  objectReadRows,
  resetStores,
  withStore,
} from "#/shared/lib/cloudflare.test.support.ts";

import { blobResponse, candidatesOf, found, lookup, store } from "./routes.test.support.ts";
import type { Found } from "./routes.test.support.ts";

const SMALL_LIMITS = {
  requestBytes: 4096,
  inlineValueBytes: 16,
  responseBytes: 4096,
  entriesPerKey: 8,
  storedBytes: 250,
  retentionDays: 7,
  uploadsPerDay: 6,
  objectReadsPerDay: 4,
  requestsPerMinute: 1200,
};

const withSmallLimits = <Success, Failure, Requirements>(
  effect: Effect.Effect<Success, Failure, Requirements>,
): Effect.Effect<Success, Failure, Requirements> =>
  Effect.provideService(effect, Limits, SMALL_LIMITS);

const OK = 200;
const NOT_FOUND = 404;
const TOO_LARGE = 413;
const TOO_MANY = 429;
const VALUE_BYTES = 100;
const UPLOADS_ALLOWED = 6;
const OBJECT_READS_ALLOWED = 4;
const OVERSIZED = 5000;
const FIRST_VERSION = 1;

const KEY_HEX_LENGTH = 64;

const NO_BLOB = "";

const blobIdOf = (hit: Found): string =>
  pipe(
    Arr.head(hit.entries),
    Option.flatMapNullishOr((entry) => entry.blob_id),
    Option.getOrElse(() => NO_BLOB),
  );
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
  yield* withStore(sweep);
  const oldest = yield* lookup(keyOf(FIRST_VERSION));
  expect(oldest.status).toBe(NOT_FOUND);
  const kept = yield* found(keyOf(STORED));
  const values = pipe(
    kept.entries,
    Arr.map((entry) => entry.value),
  );
  expect(values).toStrictEqual([valueOf(STORED)]);
  const objectsLeft = yield* objectCount;
  expect(objectsLeft).toBe(KEPT_OBJECTS);
});

const dropsEntriesPastRetention = Effect.gen(function* dropsEntriesPastRetention() {
  yield* storeVersions(FIRST_VERSION);
  yield* TestClock.adjust(PAST_RETENTION);
  yield* withStore(sweep);
  const expired = yield* lookup(keyOf(FIRST_VERSION));
  expect(expired.status).toBe(NOT_FOUND);
  const objectsLeft = yield* objectCount;
  expect(objectsLeft).toBe(NO_OBJECTS);
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
    const hit = yield* Effect.fromOption(Arr.head(reads)).pipe(Effect.flatMap(candidatesOf));
    const blob = yield* blobResponse(blobIdOf(hit));
    expect(blob.status).toBe(NOT_FOUND);
  },
);

const MISSING_BLOB = `999-${pipe("0", Str.repeat(KEY_HEX_LENGTH))}`;

const INLINE = new Uint8Array([FIRST_VERSION]);

const storedBlobId = Effect.gen(function* storedBlobId() {
  yield* store({ key: keyOf(FIRST_VERSION), value: INLINE, blob: Option.some(INLINE) });
  const hit = yield* found(keyOf(FIRST_VERSION));
  return blobIdOf(hit);
});

const chargesNothingForAMissingBlob = Effect.gen(function* chargesNothingForAMissingBlob() {
  const id = yield* storedBlobId;
  const missing = yield* Effect.forEach(
    Arr.range(FIRST_VERSION, OBJECT_READS_ALLOWED + FIRST_VERSION),
    () => blobResponse(MISSING_BLOB),
    { concurrency: 1 },
  );
  expect(pipe(missing, Arr.map(statusOf), Arr.dedupe)).toStrictEqual([NOT_FOUND]);
  const rows = yield* objectReadRows;
  expect(rows).toBe(NO_OBJECTS);
  const blob = yield* blobResponse(id);
  expect(blob.status).toBe(OK);
});

const stopsRecordingReadsPastTheDailyCap = Effect.gen(
  function* stopsRecordingReadsPastTheDailyCap() {
    const id = yield* storedBlobId;
    const reads = yield* Effect.forEach(
      Arr.range(FIRST_VERSION, OBJECT_READS_ALLOWED + STORED),
      () => blobResponse(id),
      { concurrency: 1 },
    );
    expect(pipe(reads, Arr.map(statusOf))).toStrictEqual([
      ...Arr.replicate(OK, OBJECT_READS_ALLOWED),
      ...Arr.replicate(NOT_FOUND, STORED),
    ]);
    const rows = yield* objectReadRows;
    expect(rows).toBe(OBJECT_READS_ALLOWED);
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
  it.effect("drops the oldest entries once the stored bytes pass the cap", () =>
    withSmallLimits(dropsTheOldestPastTheStoredBytes),
  );
  it.effect("drops entries older than the retention period", () =>
    withSmallLimits(dropsEntriesPastRetention),
  );
  it.effect("refuses uploads beyond the daily cap", () =>
    withSmallLimits(refusesUploadsPastTheDailyCap),
  );
  it.effect("stops reading stored objects beyond the daily cap", () =>
    withSmallLimits(stopsReadingObjectsPastTheDailyCap),
  );
  it.effect("charges no object read for a blob that does not exist", () =>
    withSmallLimits(chargesNothingForAMissingBlob),
  );
  it.effect("stops recording object reads once the daily cap is spent", () =>
    withSmallLimits(stopsRecordingReadsPastTheDailyCap),
  );
  it.effect("refuses a request body over the size limit", () =>
    withSmallLimits(refusesAnOversizedBody),
  );
});
