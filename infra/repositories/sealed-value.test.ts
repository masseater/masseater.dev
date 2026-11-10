import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { fails, randomKey } from "./app-store.test.support.ts";
import { seal, unseal } from "./sealed-value.ts";

const SEALED_PREFIX = "v1.";
const SEPARATOR = ".";
const PLAINTEXT = "obviously-fake-plaintext";
const NAME = "app";
const SHORT_KEY = "00112233445566778899aabbccddeeff";
const BROKEN_KEY = "not-a-key";
const CIPHERTEXT_PART = 2;
const FIRST_CHARACTER = 1;

const SEALING = { key: randomKey(), name: NAME };

const SEALED = { status: "sealed", plaintext: PLAINTEXT };

const LEGACY = { status: "legacy", plaintext: PLAINTEXT };

const flipFirst = (text: string): string => {
  const rest = Str.slice(FIRST_CHARACTER)(text);
  if (Str.startsWith("A")(text)) {
    return `B${rest}`;
  }
  return `A${rest}`;
};

const tamper = (stored: string): string =>
  pipe(
    Str.split(SEPARATOR)(stored),
    Arr.map((part, index) => {
      if (index === CIPHERTEXT_PART) {
        return flipFirst(part);
      }
      return part;
    }),
    Arr.join(SEPARATOR),
  );

const sealed = seal({ ...SEALING, plaintext: PLAINTEXT });

test("封をした値は v1 の封筒になり、同じ鍵と名前で元に戻る", () =>
  Effect.runPromise(
    Effect.gen(function* roundTrip() {
      const stored = yield* sealed;
      const unsealed = yield* unseal({ ...SEALING, stored });
      expect(Str.startsWith(SEALED_PREFIX)(stored)).toBe(true);
      expect(Str.includes(PLAINTEXT)(stored)).toBe(false);
      expect(unsealed).toStrictEqual(SEALED);
    }),
  ));

test("同じ値でも、封をするたびに違う封筒になる", () =>
  Effect.runPromise(
    Effect.gen(function* freshNonce() {
      const first = yield* sealed;
      const second = yield* sealed;
      expect(first).not.toBe(second);
    }),
  ));

test("暗号文を書き換えた封筒は開かない", () =>
  Effect.runPromise(
    Effect.gen(function* tampered() {
      const stored = yield* sealed;
      const failed = yield* fails(unseal({ ...SEALING, stored: tamper(stored) }));
      expect(failed).toBe(true);
    }),
  ));

test("別の名前で封をした封筒は開かない", () =>
  Effect.runPromise(
    Effect.gen(function* otherName() {
      const stored = yield* sealed;
      const failed = yield* fails(unseal({ ...SEALING, name: "atp_app_password", stored }));
      expect(failed).toBe(true);
    }),
  ));

test("別の鍵では封筒は開かない", () =>
  Effect.runPromise(
    Effect.gen(function* otherKey() {
      const stored = yield* sealed;
      const other = { key: randomKey(), name: NAME, stored };
      const failed = yield* fails(unseal(other));
      expect(failed).toBe(true);
    }),
  ));

test("v1 で始まらない値は、鍵が壊れていても、封をする前の平文として返す", () =>
  Effect.runPromise(
    Effect.gen(function* legacy() {
      const unsealed = yield* unseal({ ...SEALING, stored: PLAINTEXT });
      const withBrokenKey = yield* unseal({ key: BROKEN_KEY, name: NAME, stored: PLAINTEXT });
      expect(unsealed).toStrictEqual(LEGACY);
      expect(withBrokenKey).toStrictEqual(LEGACY);
    }),
  ));

test.each([
  `${SEALED_PREFIX}${PLAINTEXT}`,
  `${SEALED_PREFIX}AAAA${SEPARATOR}AAAA`,
  `${SEALED_PREFIX}AAAAAAAAAAAAAAAA${SEPARATOR}AAAA${SEPARATOR}AAAA`,
  SEALED_PREFIX,
])("v1 で始まるが形の崩れた値 %s は、平文として扱わずに失敗する", (stored) =>
  Effect.runPromise(
    Effect.gen(function* malformed() {
      const failed = yield* fails(unseal({ ...SEALING, stored }));
      expect(failed).toBe(true);
    }),
  ),
);

test.each([SHORT_KEY, BROKEN_KEY])("256 ビットの鍵でない %s では封をしない", (key) =>
  Effect.runPromise(
    Effect.gen(function* badKey() {
      const failed = yield* fails(seal({ key, name: NAME, plaintext: PLAINTEXT }));
      expect(failed).toBe(true);
    }),
  ),
);
