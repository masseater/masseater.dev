import { Effect, Option, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { fails, memoryStore, randomKey } from "./app-store.test.support.ts";
import { readRow, readSealed, swapRow, writeSealed } from "./app-store.ts";

const NAME = "app";
const PLAINTEXT = "obviously-fake-plaintext";
const SEALED_PREFIX = "v1.";
const MALFORMED = `${SEALED_PREFIX}broken`;

const isSealed = (stored: Option.Option<string>): boolean =>
  Option.exists(
    stored,
    (value) => Str.startsWith(SEALED_PREFIX)(value) && !Str.includes(PLAINTEXT)(value),
  );

test("書き込みは平文を残さず、v1 の封筒だけを置く", () =>
  Effect.runPromise(
    Effect.gen(function* write() {
      const { env, rows } = memoryStore();
      yield* writeSealed({ env, name: NAME, plaintext: PLAINTEXT });
      const read = yield* readSealed({ env, name: NAME });
      expect(isSealed(rows.get(NAME))).toBe(true);
      expect(read).toStrictEqual(Option.some(PLAINTEXT));
    }),
  ));

test("行が無ければ何も返さない", () =>
  Effect.runPromise(
    Effect.gen(function* absent() {
      const { env } = memoryStore();
      const read = yield* readSealed({ env, name: NAME });
      expect(read).toStrictEqual(Option.none());
    }),
  ));

test("変更前に置かれた平文の行はそのまま読め、読んだときに封筒へ書き換わる", () =>
  Effect.runPromise(
    Effect.gen(function* legacy() {
      const { env, rows } = memoryStore({ [NAME]: PLAINTEXT });
      const first = yield* readSealed({ env, name: NAME });
      const migrated = rows.get(NAME);
      const second = yield* readSealed({ env, name: NAME });
      expect(first).toStrictEqual(Option.some(PLAINTEXT));
      expect(isSealed(migrated)).toBe(true);
      expect(second).toStrictEqual(Option.some(PLAINTEXT));
      expect(rows.get(NAME)).toStrictEqual(migrated);
    }),
  ));

test("鍵が壊れていて書き換えに失敗しても、平文の行は読め、行はそのまま残る", () =>
  Effect.runPromise(
    Effect.gen(function* brokenKey() {
      const { env, rows } = memoryStore({ [NAME]: PLAINTEXT });
      const broken = { ...env, SEAL_KEY: "not-a-key" };
      const read = yield* readSealed({ env: broken, name: NAME });
      expect(read).toStrictEqual(Option.some(PLAINTEXT));
      expect(rows.get(NAME)).toStrictEqual(Option.some(PLAINTEXT));
    }),
  ));

test("別の鍵で封をした行は失敗し、暗号文を平文として返さない", () =>
  Effect.runPromise(
    Effect.gen(function* otherKey() {
      const { env } = memoryStore();
      yield* writeSealed({ env, name: NAME, plaintext: PLAINTEXT });
      const other = { ...env, SEAL_KEY: randomKey() };
      const failed = yield* fails(readSealed({ env: other, name: NAME }));
      expect(failed).toBe(true);
    }),
  ));

test("形の崩れた v1 の行は失敗し、平文として返さず、書き換えもしない", () =>
  Effect.runPromise(
    Effect.gen(function* malformed() {
      const { env, rows } = memoryStore({ [NAME]: MALFORMED });
      const failed = yield* fails(readSealed({ env, name: NAME }));
      expect(failed).toBe(true);
      expect(rows.get(NAME)).toStrictEqual(Option.some(MALFORMED));
    }),
  ));

test("入れ替えは、読んだときの値のままの行と、まだ無い行にだけ効く", () =>
  Effect.runPromise(
    Effect.gen(function* swap() {
      const { env, rows } = memoryStore();
      const row = { env, name: NAME };
      const swapped = yield* Effect.forEach(
        [
          { expected: Option.none(), value: "first" },
          { expected: Option.none(), value: "second" },
          { expected: Option.some("stale"), value: "second" },
          { expected: Option.some("first"), value: "second" },
        ],
        (change) => swapRow({ ...row, ...change }),
      );
      const read = yield* readRow(row);
      expect(swapped).toStrictEqual([true, false, false, true]);
      expect(rows.get(NAME)).toStrictEqual(Option.some("second"));
      expect(read).toStrictEqual(Option.some("second"));
    }),
  ));
