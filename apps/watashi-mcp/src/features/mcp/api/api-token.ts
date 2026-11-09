import { Effect, String as Str } from "effect";
import { Base64Url, Hex } from "effect/encoding";

const TOKEN_PREFIX = "wat_";
const ID_PREFIX = "tok_";
const TOKEN_BYTES = 32;
const ID_BYTES = 8;

const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));

const newApiToken = (): Readonly<{ id: string; token: string }> => ({
  id: `${ID_PREFIX}${Hex.encode(randomBytes(ID_BYTES))}`,
  token: `${TOKEN_PREFIX}${Base64Url.encode(randomBytes(TOKEN_BYTES))}`,
});

const hashApiToken = (token: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))).pipe(
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );

const isApiToken: (token: string) => boolean = Str.startsWith(TOKEN_PREFIX);

export { hashApiToken, isApiToken, newApiToken };
