import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { Hex } from "effect/encoding";

import { clientNetwork } from "#/features/star-songs/model/client-network.ts";

const networkOf = (request: Request): string =>
  clientNetwork(request.headers.get("cf-connecting-ip") ?? "");

export const flooded = Effect.fn("stars.flooded")(function* flooded(request: Request) {
  const outcome = yield* Effect.promise(() => env.STARS_LIMITER.limit({ key: networkOf(request) }));
  return !outcome.success;
});

export const visitorOf = Effect.fn("stars.visitor")(function* visitorOf(request: Request) {
  const salted = new TextEncoder().encode(`${env.VISITOR_SALT}:${networkOf(request)}`);
  const digest = yield* Effect.promise(() => crypto.subtle.digest("SHA-256", salted));
  return Hex.encode(new Uint8Array(digest));
});
