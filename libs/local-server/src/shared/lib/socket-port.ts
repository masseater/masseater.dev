import { Match, Option } from "effect";
import type { NetAddress } from "effect/net";

/** @internal */
export const portOf = Match.type<NetAddress.SocketAddress>().pipe(
  Match.tag("UnixPathAddress", () => Option.none<number>()),
  Match.orElse(({ port }) => Option.some(port)),
);
