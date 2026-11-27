import type { Effect } from "effect";
import { Option, pipe } from "effect";

import { accessOAuthRoute } from "#/features/access-oauth/index.ts";
import { atprotoRoute } from "#/features/issue-app-password/index.ts";
import { tailnetRoute } from "#/features/join-tailnet/index.ts";
import { exposureRoute } from "#/features/report-exposure/index.ts";
import { redMainRoute } from "#/features/wake-on-red-main/index.ts";
import type { QueuedEnv } from "#/shared/api/index.ts";

export type SideRouteInput = Readonly<{ request: Request; env: QueuedEnv }>;

export const sideRoute = (input: SideRouteInput): Option.Option<Effect.Effect<Response>> =>
  pipe(
    atprotoRoute(input),
    Option.orElse(() => accessOAuthRoute(input)),
    Option.orElse(() => tailnetRoute(input)),
    Option.orElse(() => exposureRoute(input)),
    Option.orElse(() => redMainRoute(input)),
  );
