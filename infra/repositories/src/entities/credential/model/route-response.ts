import { Effect } from "effect";
import type { Schema } from "effect";

import type { Rejected } from "./github-oidc.ts";

const UNAUTHORIZED = 401;
const BAD_GATEWAY = 502;

export const answeredAs =
  (route: string) =>
  (handled: Effect.Effect<Response, Rejected | Schema.SchemaError>): Effect.Effect<Response> =>
    handled.pipe(
      Effect.catchTag("Rejected", (rejected) =>
        Effect.logWarning(`${route}.unauthorized`).pipe(
          Effect.annotateLogs({ reason: rejected.reason }),
          Effect.as(new Response("", { status: UNAUTHORIZED })),
        ),
      ),
      Effect.catchCause((cause) =>
        Effect.logError(`${route}.failed`, cause).pipe(
          Effect.as(new Response("", { status: BAD_GATEWAY })),
        ),
      ),
    );
