import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import { Base64Url, Hex } from "effect/encoding";

const ENVELOPE_VERSION = "v1";
const SEPARATOR = ".";
const ENVELOPE_PREFIX = `${ENVELOPE_VERSION}${SEPARATOR}`;
const VERSION_PARTS = 1;
const ALGORITHM = "AES-GCM";
const KEY_BYTES = 32;
const IV_BYTES = 12;

type Sealable = Readonly<{ key: string; name: string; plaintext: string }>;

type Stored = Readonly<{ key: string; name: string; stored: string }>;

type Unsealed = Readonly<{ status: "legacy" | "sealed"; plaintext: string }>;

type Envelope = Readonly<{ iv: Uint8Array; ciphertext: Uint8Array }>;

const taggedError = Schema.TaggedError;

class SealFailed extends taggedError<SealFailed, { readonly brand: unique symbol }>()(
  "SealFailed",
  { message: Schema.String },
) {}

const failedWith = (message: string) => (): SealFailed => SealFailed.make({ message });

const badKey = failedWith("the seal key is not 32 bytes of hex");

const malformed = failedWith("the sealed value is malformed");

const unsealable = failedWith("the value could not be sealed");

const unopenable = failedWith("the sealed value could not be opened with this key");

const encoder = new TextEncoder();

const decoder = new TextDecoder("utf-8", { fatal: true });

const importRaw = (bytes: Uint8Array): Effect.Effect<CryptoKey, SealFailed> =>
  Effect.tryPromise({
    try: () =>
      crypto.subtle.importKey("raw", new Uint8Array(bytes), ALGORITHM, false, [
        "encrypt",
        "decrypt",
      ]),
    catch: badKey,
  });

const importKey = (hex: string): Effect.Effect<CryptoKey, SealFailed> =>
  pipe(
    Effect.fromResult(Hex.decode(hex)),
    Effect.mapError(badKey),
    Effect.filterOrFail((bytes) => bytes.length === KEY_BYTES, badKey),
    Effect.flatMap(importRaw),
  );

const parameters = (name: string, iv: Uint8Array): AesGcmParams => ({
  name: ALGORITHM,
  iv: new Uint8Array(iv),
  additionalData: encoder.encode(name),
});

const envelope = (iv: Uint8Array, ciphertext: ArrayBuffer): string =>
  pipe(
    [ENVELOPE_VERSION, Base64Url.encode(iv), Base64Url.encode(new Uint8Array(ciphertext))],
    Arr.join(SEPARATOR),
  );

const seal = ({ key, name, plaintext }: Sealable): Effect.Effect<string, SealFailed> =>
  Effect.gen(function* sealValue() {
    const cryptoKey = yield* importKey(key);
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const ciphertext = yield* Effect.tryPromise({
      try: () => crypto.subtle.encrypt(parameters(name, iv), cryptoKey, encoder.encode(plaintext)),
      catch: unsealable,
    });
    return envelope(iv, ciphertext);
  });

const decodePart = (part: string): Effect.Effect<Uint8Array, SealFailed> =>
  pipe(Effect.fromResult(Base64Url.decode(part)), Effect.mapError(malformed));

const envelopeOf = ([iv, ciphertext, ...rest]: readonly Uint8Array[]): Option.Option<Envelope> =>
  pipe(
    Option.all({ iv: Option.fromNullishOr(iv), ciphertext: Option.fromNullishOr(ciphertext) }),
    Option.filter((parts) => parts.iv.length === IV_BYTES && Arr.isReadonlyArrayEmpty(rest)),
  );

const parse = (stored: string): Effect.Effect<Envelope, SealFailed> =>
  pipe(
    Str.split(SEPARATOR)(stored),
    Arr.drop(VERSION_PARTS),
    Effect.forEach(decodePart),
    Effect.map(envelopeOf),
    Effect.flatMap(Effect.fromOption),
    Effect.mapError(malformed),
  );

const open = ({ key, name, stored }: Stored): Effect.Effect<string, SealFailed> =>
  Effect.gen(function* openValue() {
    const cryptoKey = yield* importKey(key);
    const { iv, ciphertext } = yield* parse(stored);
    const plaintext = yield* Effect.tryPromise({
      try: () => crypto.subtle.decrypt(parameters(name, iv), cryptoKey, new Uint8Array(ciphertext)),
      catch: unopenable,
    });
    return yield* Effect.try({ try: () => decoder.decode(plaintext), catch: malformed });
  });

const unseal = (sealed: Stored): Effect.Effect<Unsealed, SealFailed> => {
  if (Str.startsWith(ENVELOPE_PREFIX)(sealed.stored)) {
    return open(sealed).pipe(
      Effect.map((plaintext): Unsealed => ({ status: "sealed", plaintext })),
    );
  }
  return Effect.succeed({ status: "legacy", plaintext: sealed.stored });
};

export { SealFailed, seal, unseal };
export type { Sealable, Stored, Unsealed };
