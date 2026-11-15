import type { Effect } from "effect";
import { Option, pipe } from "effect";

import { accessOAuthRoute } from "./access-oauth.ts";
import { atprotoRoute } from "./atproto.ts";
import type { RouteInput } from "./github-app.ts";
import { tailnetRoute } from "./tailnet.ts";

export const sideRoute = (input: RouteInput): Option.Option<Effect.Effect<Response>> =>
  pipe(
    atprotoRoute(input),
    Option.orElse(() => accessOAuthRoute(input)),
    Option.orElse(() => tailnetRoute(input)),
  );
