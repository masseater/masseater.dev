import { Effect, Option, Result, Schema } from "effect";
import { Hex } from "effect/encoding";

import { readSealed, swapSealed } from "./app-store.ts";
import type { AppStoreEnv } from "./app-store.ts";
import { SealFailed } from "./sealed-value.ts";
import type { SigningPair } from "./ssh-certificate.ts";

export type SigningKeyKind = Readonly<{ name: string; algorithm: "Ed25519" | "RS256" }>;

export const SSH_CA: SigningKeyKind = { name: "tailnet_ssh_ca", algorithm: "Ed25519" };

export const OIDC_SIGNER: SigningKeyKind = { name: "tailnet_oidc_signer", algorithm: "RS256" };

const RS256_MODULUS_BITS = 2048;

const RS256_PUBLIC_EXPONENT = new Uint8Array(
  Result.getOrElse(Hex.decode("010001"), () => new Uint8Array()),
);

const PARAMETERS: Readonly<Record<SigningKeyKind["algorithm"], RsaHashedKeyGenParams | Algorithm>> =
  {
    Ed25519: { name: "Ed25519" },
    RS256: {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: RS256_MODULUS_BITS,
      publicExponent: RS256_PUBLIC_EXPONENT,
      hash: "SHA-256",
    },
  };

const parameters = (kind: SigningKeyKind): RsaHashedKeyGenParams | Algorithm =>
  PARAMETERS[kind.algorithm];

const StoredJwk = Schema.Record(Schema.String, Schema.Unknown);

const StoredPair = Schema.fromJsonString(
  Schema.Struct({ privateKey: StoredJwk, publicKey: StoredJwk }),
);

const unusable = (message: string) => (): SealFailed => SealFailed.make({ message });

const exportJwk = (key: CryptoKey): Effect.Effect<JsonWebKey, SealFailed> =>
  Effect.tryPromise({
    try: () => crypto.subtle.exportKey("jwk", key),
    catch: unusable("the signing key could not be exported"),
  });

const exported = (pair: SigningPair): Effect.Effect<string, SealFailed> =>
  Effect.all([exportJwk(pair.privateKey), exportJwk(pair.publicKey)]).pipe(
    Effect.flatMap(([privateKey, publicKey]) =>
      Schema.encodeEffect(StoredPair)({
        privateKey: { ...privateKey },
        publicKey: { ...publicKey },
      }),
    ),
    Effect.mapError(unusable("the signing key could not be encoded")),
  );

const importJwk =
  (kind: SigningKeyKind, usage: KeyUsage) =>
  (jwk: typeof StoredJwk.Type): Effect.Effect<CryptoKey, SealFailed> =>
    Effect.tryPromise({
      try: () => crypto.subtle.importKey("jwk", jwk, parameters(kind), true, [usage]),
      catch: unusable(`${kind.name} could not be imported`),
    });

const imported = (kind: SigningKeyKind, json: string): Effect.Effect<SigningPair, SealFailed> =>
  Schema.decodeEffect(StoredPair)(json).pipe(
    Effect.mapError(unusable(`${kind.name} is not a stored key pair`)),
    Effect.flatMap(({ privateKey, publicKey }) =>
      Effect.all({
        privateKey: importJwk(kind, "sign")(privateKey),
        publicKey: importJwk(kind, "verify")(publicKey),
      }),
    ),
  );

const isPair = (key: CryptoKey | SigningPair): key is SigningPair => "privateKey" in key;

const generated = (kind: SigningKeyKind): Effect.Effect<SigningPair, SealFailed> =>
  Effect.tryPromise({
    try: () => crypto.subtle.generateKey(parameters(kind), true, ["sign", "verify"]),
    catch: unusable(`${kind.name} could not be generated`),
  }).pipe(Effect.filterOrFail(isPair, unusable(`${kind.name} is not a key pair`)));

const stored = (
  env: AppStoreEnv,
  kind: SigningKeyKind,
): Effect.Effect<Option.Option<SigningPair>, SealFailed> =>
  readSealed({ env, name: kind.name }).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (json) => Effect.asSome(imported(kind, json)),
      }),
    ),
  );

const created = (env: AppStoreEnv, kind: SigningKeyKind): Effect.Effect<SigningPair, SealFailed> =>
  Effect.gen(function* create() {
    const pair = yield* generated(kind);
    const plaintext = yield* exported(pair);
    const saved = yield* swapSealed({ env, name: kind.name, plaintext, expected: Option.none() });
    if (saved) {
      yield* Effect.logInfo("signing_key.created").pipe(Effect.annotateLogs({ name: kind.name }));
      return pair;
    }
    return yield* stored(env, kind).pipe(
      Effect.flatMap(Effect.fromOption),
      Effect.mapError(unusable(`${kind.name} was neither saved nor found`)),
    );
  });

export const signingKey =
  (kind: SigningKeyKind) =>
  (env: AppStoreEnv): Effect.Effect<SigningPair, SealFailed> =>
    stored(env, kind).pipe(
      Effect.flatMap(Option.match({ onNone: () => created(env, kind), onSome: Effect.succeed })),
    );
