import { Option, pipe } from "effect";
import type { Effect } from "effect";

import { accessOAuthRoute } from "./access-oauth.ts";
import { atprotoRoute } from "./atproto.ts";
import type { ExposureEnv } from "./exposure-ledger.ts";
import { exposureRoute } from "./exposure.ts";

type SideRouteInput = Readonly<{ request: Request; env: ExposureEnv }>;

const sideRoute = (input: SideRouteInput): Option.Option<Effect.Effect<Response>> =>
  pipe(
    atprotoRoute(input),
    Option.orElse(() => accessOAuthRoute(input)),
    Option.orElse(() => exposureRoute(input)),
  );

export { sideRoute };
export type { SideRouteInput };
