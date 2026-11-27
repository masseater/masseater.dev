import { Array as Arr, Effect, Option, Record as Rec, Schema, pipe } from "effect";

import type { Claims } from "#/entities/credential/index.ts";
import {
  EXPOSURE_GRANT_KEY,
  Rejected,
  answeredAs,
  grantKeys,
  verify,
} from "#/entities/credential/index.ts";
import {
  LedgerJson,
  ReportJson,
  notify,
  remember,
} from "#/features/report-exposure/model/exposure-ledger.ts";
import type { QueuedEnv } from "#/shared/api/index.ts";

const LEDGER_PATH = "/exposure/ledger";
const REPORT_PATH = "/exposure/report";

export type ExposureRoute = Readonly<{ request: Request; env: QueuedEnv }>;

const authorized = (
  request: Request,
): Effect.Effect<typeof Claims.Type, Rejected | Schema.SchemaError> =>
  verify(request).pipe(
    Effect.filterOrFail(
      (claims) => Arr.contains(grantKeys(claims), EXPOSURE_GRANT_KEY),
      (claims) => Rejected.make({ reason: `no exposure grant for ${claims.repository}` }),
    ),
  );

const body = <Codec extends Schema.Codec<unknown, string>>(
  request: Request,
  codec: Codec,
): Effect.Effect<Codec["Type"], Schema.SchemaError> =>
  Effect.promise(() => request.text()).pipe(Effect.flatMap(Schema.decodeEffect(codec)));

const handlers: Readonly<
  Record<
    string,
    (
      route: ExposureRoute,
      claims: typeof Claims.Type,
    ) => Effect.Effect<Response, Schema.SchemaError>
  >
> = {
  [LEDGER_PATH]: ({ request, env }) =>
    body(request, LedgerJson).pipe(
      Effect.flatMap(({ entries }) => remember({ env, observed: entries })),
    ),
  [REPORT_PATH]: ({ request, env }, claims) =>
    body(request, ReportJson).pipe(Effect.flatMap((report) => notify({ env, claims, report }))),
};

export const exposureRoute = (route: ExposureRoute): Option.Option<Effect.Effect<Response>> =>
  pipe(
    Option.liftPredicate(route.request, (request) => request.method === "POST"),
    Option.flatMap((request) => Rec.get(handlers, new URL(request.url).pathname)),
    Option.map((handler) =>
      authorized(route.request).pipe(
        Effect.flatMap((claims) => handler(route, claims)),
        answeredAs("exposure"),
      ),
    ),
  );
