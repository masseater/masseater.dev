import { Effect } from "effect";
import { Hex } from "effect/encoding";

import { clientNetwork } from "#/features/star-songs/model/client-network.ts";

import { StarSite } from "./star-site.server.ts";

const networkOf = (request: Request): string =>
  clientNetwork(request.headers.get("cf-connecting-ip") ?? "");

export const flooded = Effect.fn("stars.flooded")(function* flooded(request: Request) {
  const { STARS_LIMITER } = yield* StarSite;
  const outcome = yield* Effect.promise(() => STARS_LIMITER.limit({ key: networkOf(request) }));
  return !outcome.success;
});

export const visitorOf = Effect.fn("stars.visitor")(function* visitorOf(request: Request) {
  const { VISITOR_SALT } = yield* StarSite;
  const salted = new TextEncoder().encode(`${VISITOR_SALT}:${networkOf(request)}`);
  const digest = yield* Effect.promise(() => crypto.subtle.digest("SHA-256", salted));
  return Hex.encode(new Uint8Array(digest));
});
