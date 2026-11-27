import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { afterAll, beforeEach } from "vite-plus/test";

import {
  BRANCH_CI_TOKEN,
  COMMENT_CI_TOKEN,
  PRIVATE_CI_TOKEN,
  STORING_EVENTS,
  eventToken,
} from "#/app/token.test.support.ts";
import {
  closeDatabase,
  flood,
  objectCount,
  resetStores,
} from "#/shared/lib/cloudflare.test.support.ts";

import {
  anonymous,
  blob,
  blobResponse,
  found,
  lookup,
  store,
  storeAs,
} from "./routes.test.support.ts";
import type { Found } from "./routes.test.support.ts";

const OK = 200;
const UNAUTHORIZED = 401;
const NOT_FOUND = 404;
const TOO_MANY = 429;
const KEPT_PER_KEY = 8;
const STORED_PER_KEY = 10;
const LARGE = 300_000;
const BYTE_VALUES = 256;
const NO_OBJECTS = 0;
const ONE_OBJECT = 1;
const FIRST_VERSION = 1;
const NO_BLOB = "";

const encoder = new TextEncoder();

const KEY = encoder.encode("key");
const OTHER_KEY = encoder.encode("other key");
const SMALL = encoder.encode("v");
const BINARY = encoder.encode("\u0000ÿ\r\n--\u0080\r\n\r\nÈ");

const patterned = (length: number): Uint8Array =>
  Uint8Array.from({ length }, (_unused, index) => index % BYTE_VALUES);

const blobIdOf = (entries: readonly { readonly blob_id: string | null }[]): string =>
  pipe(
    Arr.head(entries),
    Option.flatMapNullishOr((entry) => entry.blob_id),
    Option.getOrElse(() => NO_BLOB),
  );

const valuesOf = (hit: Found): readonly Uint8Array[] =>
  pipe(
    hit.entries,
    Arr.map((entry) => entry.value),
  );

const statusOf = (response: Response): number => response.status;

const returnsAStoredValue = Effect.gen(function* returnsAStoredValue() {
  const stored = yield* store({ key: KEY, value: BINARY, blob: Option.none() });
  expect(stored.status).toBe(OK);
  const hit = yield* found(KEY);
  expect(hit.kind).toBe("exact");
  expect(valuesOf(hit)).toStrictEqual([BINARY]);
  expect(blobIdOf(hit.entries)).toBe(NO_BLOB);
  const objectsLeft = yield* objectCount;
  expect(objectsLeft).toBe(NO_OBJECTS);
});

const missesAnUnknownKey = Effect.gen(function* missesAnUnknownKey() {
  yield* store({ key: KEY, value: BINARY, blob: Option.none() });
  const missed = yield* lookup(OTHER_KEY);
  expect(missed.status).toBe(NOT_FOUND);
});

const handsBackABlob = Effect.gen(function* handsBackABlob() {
  yield* store({ key: KEY, value: SMALL, blob: Option.some(BINARY) });
  const hit = yield* found(KEY);
  const bytes = yield* blob(blobIdOf(hit.entries));
  expect(bytes).toStrictEqual(BINARY);
});

const KEY_HEX = /[0-9a-f]{64}$/u;
const KEY_HEX_LENGTH = 64;
const WRONG_KEY = pipe("0", Str.repeat(KEY_HEX_LENGTH));

const refusesABlobIdWithoutItsKey = Effect.gen(function* refusesABlobIdWithoutItsKey() {
  yield* store({ key: KEY, value: SMALL, blob: Option.some(BINARY) });
  const hit = yield* found(KEY);
  const id = blobIdOf(hit.entries);
  expect(id).toMatch(KEY_HEX);
  const guessed = yield* blobResponse(Str.replace(KEY_HEX, WRONG_KEY)(id));
  expect(guessed.status).toBe(NOT_FOUND);
  const bare = yield* blobResponse(Str.replace(/-.*$/u, "")(id));
  expect(bare.status).toBe(NOT_FOUND);
});

const keepsALargeValueAndItsBlobApart = Effect.gen(function* keepsALargeValueAndItsBlobApart() {
  const value = patterned(LARGE);
  yield* store({ key: KEY, value, blob: Option.some(BINARY) });
  const hit = yield* found(KEY);
  expect(valuesOf(hit)).toStrictEqual([value]);
  const bytes = yield* blob(blobIdOf(hit.entries));
  expect(bytes).toStrictEqual(BINARY);
  const objectsLeft = yield* objectCount;
  expect(objectsLeft).toBe(ONE_OBJECT);
});

const versioned = (version: number): Uint8Array => encoder.encode(`version ${String(version)}`);

const listsTheNewestFirst = Effect.gen(function* listsTheNewestFirst() {
  yield* Effect.forEach(
    Arr.range(FIRST_VERSION, STORED_PER_KEY),
    (version) => store({ key: KEY, value: versioned(version), blob: Option.some(BINARY) }),
    { concurrency: 1 },
  );
  const hit = yield* found(KEY);
  const kept = Arr.reverse(
    Arr.range(STORED_PER_KEY - KEPT_PER_KEY + FIRST_VERSION, STORED_PER_KEY),
  );
  expect(valuesOf(hit)).toStrictEqual(pipe(kept, Arr.map(versioned)));
  const objectsLeft = yield* objectCount;
  expect(objectsLeft).toBe(KEPT_PER_KEY);
});

const refusesAStoreWithoutAMainBranchRun = Effect.gen(
  function* refusesAStoreWithoutAMainBranchRun() {
    const entry = { key: KEY, value: BINARY, blob: Option.none() };
    const callers = [
      anonymous,
      Option.some("forged"),
      Option.some(BRANCH_CI_TOKEN),
      Option.some(COMMENT_CI_TOKEN),
    ];
    const refused = yield* Effect.forEach(callers, (caller) => storeAs(caller)(entry), {
      concurrency: 1,
    });
    expect(pipe(refused, Arr.map(statusOf))).toStrictEqual(
      Arr.replicate(UNAUTHORIZED, callers.length),
    );
    const missed = yield* lookup(KEY);
    expect(missed.status).toBe(NOT_FOUND);
  },
);

const admitsEveryStoringEvent = Effect.gen(function* admitsEveryStoringEvent() {
  const entry = { key: KEY, value: BINARY, blob: Option.none() };
  const admitted = yield* Effect.forEach(
    STORING_EVENTS,
    (event) => storeAs(Option.some(eventToken(event)))(entry),
    { concurrency: 1 },
  );
  expect(pipe(admitted, Arr.map(statusOf))).toStrictEqual(Arr.replicate(OK, STORING_EVENTS.length));
});

const hidesAPrivateRepository = Effect.gen(function* hidesAPrivateRepository() {
  const privateRun = Option.some(PRIVATE_CI_TOKEN);
  yield* storeAs(privateRun)({ key: KEY, value: BINARY, blob: Option.none() });
  const hidden = yield* lookup(KEY);
  expect(hidden.status).toBe(NOT_FOUND);
  yield* store({ key: KEY, value: BINARY, blob: Option.none() });
  const open = yield* lookup(KEY);
  expect(open.status).toBe(OK);
});

const refusesAFlood = Effect.gen(function* refusesAFlood() {
  yield* store({ key: KEY, value: BINARY, blob: Option.none() });
  yield* flood;
  const refused = yield* lookup(KEY);
  expect(refused.status).toBe(TOO_MANY);
});

beforeEach(() => Effect.runPromise(resetStores));
afterAll(() => Effect.runPromise(closeDatabase));

describe("task cache", () => {
  it.effect("returns a stored value to a lookup of the same key", () => returnsAStoredValue);
  it.effect("misses a key that was never stored", () => missesAnUnknownKey);
  it.effect("hands back the bytes of a stored blob unchanged", () => handsBackABlob);
  it.effect("refuses a blob id that lacks the key of its entry", () => refusesABlobIdWithoutItsKey);
  it.effect(
    "keeps a large value and its blob apart in one object",
    () => keepsALargeValueAndItsBlobApart,
  );
  it.effect(
    "lists the newest entry first and drops the oldest beyond the limit",
    () => listsTheNewestFirst,
  );
  it.effect(
    "refuses a store from a caller without a storing CI run on the main branch",
    () => refusesAStoreWithoutAMainBranchRun,
  );
  it.effect(
    "admits a store from a scheduled, manual or dispatched run on the main branch",
    () => admitsEveryStoringEvent,
  );
  it.effect(
    "hides a private repository from anonymous readers and opens a public one",
    () => hidesAPrivateRepository,
  );
  it.effect("refuses requests while the rate limiter is over its limit", () => refusesAFlood);
});
