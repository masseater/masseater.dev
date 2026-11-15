import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";
import { Base64 } from "effect/encoding";

const KEY_TYPE = "ssh-ed25519";
const CERT_TYPE = "ssh-ed25519-cert-v01@openssh.com";
const ALGORITHM = "Ed25519";
const PUBLIC_KEY_BYTES = 32;
const NONCE_BYTES = 32;
const USER_CERT = 1;
const UINT32_BYTES = 4;
const UINT64_BYTES = 8;
const MS_PER_SECOND = 1000;
const CLOCK_SKEW_SECONDS = 60;
const BLOB_START = 0;
const ENCODED_FIELD = 1;
const EXTENSIONS = ["permit-port-forwarding", "permit-pty", "permit-user-rc"] as const;

const taggedError = Schema.TaggedError;

class SshCertificateFailed extends taggedError<
  SshCertificateFailed,
  { readonly brand: unique symbol }
>()("SshCertificateFailed", { message: Schema.String }) {}

const failedWith = (message: string) => (): SshCertificateFailed =>
  SshCertificateFailed.make({ message });

type SigningPair = Readonly<CryptoKeyPair>;

type CertificateRequest = Readonly<{
  ca: SigningPair;
  publicKey: string;
  keyId: string;
  principals: readonly string[];
  issuedAt: number;
  lifetimeSeconds: number;
}>;

const encoder = new TextEncoder();

const decoder = new TextDecoder();

const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const joined = new Uint8Array(
    Arr.reduce(parts, BLOB_START, (total, part) => total + part.length),
  );
  Arr.reduce(parts, BLOB_START, (offset, part) => {
    joined.set(part, offset);
    return offset + part.length;
  });
  return joined;
};

const uint32 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(UINT32_BYTES);
  new DataView(bytes.buffer).setUint32(BLOB_START, value);
  return bytes;
};

const uint64 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(UINT64_BYTES);
  new DataView(bytes.buffer).setBigUint64(BLOB_START, BigInt(value));
  return bytes;
};

const bytesString = (bytes: Uint8Array): Uint8Array => concat([uint32(bytes.length), bytes]);

const textString = (text: string): Uint8Array => bytesString(encoder.encode(text));

const packed = (parts: readonly Uint8Array[]): Uint8Array => bytesString(concat(parts));

const keyBlob = (raw: Uint8Array): Uint8Array => concat([textString(KEY_TYPE), bytesString(raw)]);

const readString = (
  blob: Uint8Array,
  offset: number,
): Option.Option<Readonly<{ value: Uint8Array; next: number }>> => {
  if (offset + UINT32_BYTES > blob.length) {
    return Option.none();
  }
  const length = new DataView(blob.buffer, blob.byteOffset).getUint32(offset);
  const start = offset + UINT32_BYTES;
  return Option.liftPredicate(
    { value: blob.slice(start, start + length), next: start + length },
    ({ next }) => next <= blob.length,
  );
};

const keyFields = Option.liftPredicate(
  (fields: readonly string[]): fields is readonly [string, string, ...string[]] =>
    fields.length > ENCODED_FIELD,
);

const ed25519Raw = (blob: Uint8Array): Option.Option<Uint8Array> =>
  pipe(
    readString(blob, BLOB_START),
    Option.filter(({ value }) => decoder.decode(value) === KEY_TYPE),
    Option.flatMap(({ next }) => readString(blob, next)),
    Option.filter(({ value, next }) => value.length === PUBLIC_KEY_BYTES && next === blob.length),
    Option.map(({ value }) => value),
  );

const ed25519PublicKey = (line: string): Option.Option<Uint8Array> =>
  pipe(
    Str.trim(line),
    Str.split(/\s+/u),
    keyFields,
    Option.filter(([type]) => type === KEY_TYPE),
    Option.flatMap(([, encoded]) => Option.getSuccess(Base64.decode(encoded))),
    Option.flatMap(ed25519Raw),
  );

const rawPublicKey = (ca: SigningPair): Effect.Effect<Uint8Array, SshCertificateFailed> =>
  Effect.tryPromise({
    try: () => crypto.subtle.exportKey("raw", ca.publicKey),
    catch: failedWith("the CA public key could not be exported"),
  }).pipe(Effect.map((raw) => new Uint8Array(raw)));

const authorizedKey = (ca: SigningPair): Effect.Effect<string, SshCertificateFailed> =>
  rawPublicKey(ca).pipe(Effect.map((raw) => `${KEY_TYPE} ${Base64.encode(keyBlob(raw))}`));

const generateCa: Effect.Effect<SigningPair, SshCertificateFailed> = Effect.tryPromise({
  try: () => crypto.subtle.generateKey({ name: ALGORITHM }, true, ["sign", "verify"]),
  catch: failedWith("the CA key could not be generated"),
});

const emptyString = bytesString(new Uint8Array());

const extensions = packed(
  pipe(
    EXTENSIONS,
    Arr.flatMap((name) => [textString(name), emptyString]),
  ),
);

const nonce = (): Uint8Array => bytesString(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));

const toBeSigned = (
  request: CertificateRequest,
  parts: Readonly<{ subject: Uint8Array; caKey: Uint8Array }>,
): Uint8Array => {
  const issuedSeconds = Math.floor(request.issuedAt / MS_PER_SECOND);
  const principals = packed(pipe(request.principals, Arr.map(textString)));
  return concat([
    textString(CERT_TYPE),
    nonce(),
    bytesString(parts.subject),
    uint64(request.issuedAt),
    uint32(USER_CERT),
    textString(request.keyId),
    principals,
    uint64(issuedSeconds - CLOCK_SKEW_SECONDS),
    uint64(issuedSeconds + request.lifetimeSeconds),
    packed([]),
    extensions,
    packed([]),
    bytesString(keyBlob(parts.caKey)),
  ]);
};

const signCertificate = (
  request: CertificateRequest,
): Effect.Effect<string, SshCertificateFailed> =>
  Effect.gen(function* sign() {
    const subject = yield* pipe(
      ed25519PublicKey(request.publicKey),
      Effect.fromOption,
      Effect.mapError(failedWith("the public key is not an ssh-ed25519 key")),
    );
    const caKey = yield* rawPublicKey(request.ca);
    const signed = toBeSigned(request, { subject, caKey });
    const signature = yield* Effect.tryPromise({
      try: () => crypto.subtle.sign(ALGORITHM, request.ca.privateKey, new Uint8Array(signed)),
      catch: failedWith("the certificate could not be signed"),
    });
    const signatureBlob = packed([textString(KEY_TYPE), bytesString(new Uint8Array(signature))]);
    return `${CERT_TYPE} ${Base64.encode(concat([signed, signatureBlob]))} ${request.keyId}`;
  });

export { SshCertificateFailed, authorizedKey, generateCa, signCertificate };
export type { CertificateRequest, SigningPair };
