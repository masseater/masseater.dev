import { Effect, Schema } from "effect";
import { Base64 } from "effect/encoding";

const KEY_TYPE = "ssh-ed25519";
const UINT32_BYTES = 4;
const BLOB_START = 0;

const taggedError = Schema.TaggedError;

export class SshCertificateFailed extends taggedError<
  SshCertificateFailed,
  { readonly brand: unique symbol }
>()("SshCertificateFailed", { message: Schema.String }) {}

const failedWith = (message: string) => (): SshCertificateFailed =>
  SshCertificateFailed.make({ message });

export type SigningPair = Readonly<CryptoKeyPair>;

const encoder = new TextEncoder();

const uint32 = (value: number): Uint8Array => {
  const bytes = new Uint8Array(UINT32_BYTES);
  new DataView(bytes.buffer).setUint32(BLOB_START, value);
  return bytes;
};

const bytesString = (bytes: Uint8Array): Uint8Array => {
  const joined = new Uint8Array(UINT32_BYTES + bytes.length);
  joined.set(uint32(bytes.length), BLOB_START);
  joined.set(bytes, UINT32_BYTES);
  return joined;
};

const keyBlob = (raw: Uint8Array): Uint8Array => {
  const type = bytesString(encoder.encode(KEY_TYPE));
  const key = bytesString(raw);
  const joined = new Uint8Array(type.length + key.length);
  joined.set(type, BLOB_START);
  joined.set(key, type.length);
  return joined;
};

export const authorizedKey = (ca: SigningPair): Effect.Effect<string, SshCertificateFailed> =>
  Effect.tryPromise({
    try: () => crypto.subtle.exportKey("raw", ca.publicKey),
    catch: failedWith("the CA public key could not be exported"),
  }).pipe(Effect.map((raw) => `${KEY_TYPE} ${Base64.encode(keyBlob(new Uint8Array(raw)))}`));
