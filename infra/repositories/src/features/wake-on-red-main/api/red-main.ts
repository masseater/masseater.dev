import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import type { Claims } from "#/entities/credential/index.ts";
import {
  RED_MAIN_GRANT_KEYS,
  Rejected,
  answeredAs,
  grantKeys,
  verify,
  workflowFile,
} from "#/entities/credential/index.ts";
import { wake } from "#/features/wake-on-red-main/model/red-main.ts";
import type { QueuedEnv } from "#/shared/api/index.ts";

const PATH = "/wake/main-red";
const VERIFY_WORKFLOW = "verify.yml";

export type RedMainRoute = Readonly<{ request: Request; env: QueuedEnv }>;

const authorized = (
  request: Request,
): Effect.Effect<typeof Claims.Type, Rejected | Schema.SchemaError> =>
  verify(request).pipe(
    Effect.filterOrFail(
      (claims) =>
        Arr.some(grantKeys(claims), (key) => Arr.contains(RED_MAIN_GRANT_KEYS, key)) &&
        Option.contains(workflowFile(claims), VERIFY_WORKFLOW),
      (claims) => Rejected.make({ reason: `no red-main grant for ${claims.workflow_ref}` }),
    ),
  );

export const redMainRoute = ({
  request,
  env,
}: RedMainRoute): Option.Option<Effect.Effect<Response>> =>
  pipe(
    Option.liftPredicate(
      request,
      (candidate) => candidate.method === "POST" && new URL(candidate.url).pathname === PATH,
    ),
    Option.map(() =>
      authorized(request).pipe(
        Effect.flatMap((claims) => wake({ env, claims })),
        answeredAs("red_main"),
      ),
    ),
  );
