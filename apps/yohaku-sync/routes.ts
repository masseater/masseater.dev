import { CHANGES_PATH, DOCUMENTS_PATH, Pushed } from "@masseater.dev/yohaku-protocol/sync";
import { Effect, Option, Schema, pipe } from "effect";

import { changesAfter, store } from "./documents.ts";

const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const SERVER_ERROR = 500;
const FIRST = 0;

const After = Schema.NumberFromString.pipe(Schema.check(Schema.isInt()));
const decodeAfter = Schema.decodeUnknownEffect(After);
const decodePushed = Schema.decodeUnknownEffect(Schema.fromJsonString(Pushed));

const status = (code: number, text: string): Response => new Response(text, { status: code });

const badRequest = (): Effect.Effect<Response> =>
  Effect.succeed(status(BAD_REQUEST, "Bad Request"));

const storeFailed =
  (event: string) =>
  ({ message }: Readonly<{ message: string }>): Effect.Effect<Response> =>
    Effect.logError(event, { message }).pipe(Effect.as(status(SERVER_ERROR, "Server Error")));

const afterOf = (request: Request): Effect.Effect<number, Schema.SchemaError> =>
  pipe(
    Option.fromNullishOr(new URL(request.url).searchParams.get("after")),
    Option.match({ onNone: () => Effect.succeed(FIRST), onSome: decodeAfter }),
  );

const changes = (request: Request): Effect.Effect<Response> =>
  afterOf(request).pipe(
    Effect.flatMap(changesAfter),
    Effect.map((page) => Response.json(page)),
    Effect.catchTags({ SchemaError: badRequest, StoreFailed: storeFailed("sync.changes_failed") }),
  );

const push = (request: Request): Effect.Effect<Response> =>
  Effect.promise(() => request.text()).pipe(
    Effect.flatMap(decodePushed),
    Effect.flatMap(({ documents }) =>
      store(documents).pipe(Effect.as(Response.json({ stored: documents.length }))),
    ),
    Effect.catchTags({ SchemaError: badRequest, StoreFailed: storeFailed("sync.push_failed") }),
  );

const routeKey = (request: Request): string => `${request.method} ${new URL(request.url).pathname}`;

type Route = (request: Request) => Effect.Effect<Response>;

const ROUTES: ReadonlyMap<string, Route> = new Map([
  [`GET ${CHANGES_PATH}`, changes],
  [`PUT ${DOCUMENTS_PATH}`, push],
]);

const routed = (request: Request): Effect.Effect<Response> =>
  pipe(
    routeKey(request),
    (key) => Option.fromUndefinedOr(ROUTES.get(key)),
    Option.match({
      onNone: () => Effect.succeed(status(NOT_FOUND, "Not Found")),
      onSome: (route) => route(request),
    }),
  );

export { routed };
