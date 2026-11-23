import { CHANGES_PATH, DOCUMENTS_PATH, Pushed } from "@masseater.dev/yohaku-protocol/sync";
import { Effect, Option, Schema, pipe } from "effect";
import { writesFromAnotherSite, writesWithoutJson } from "security-headers/request";

import { changesAfter, store } from "#/entities/document/index.ts";

const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const UNSUPPORTED_MEDIA_TYPE = 415;
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

const served = (request: Request): Effect.Effect<Response> =>
  pipe(
    routeKey(request),
    (key) => Option.fromUndefinedOr(ROUTES.get(key)),
    Option.match({
      onNone: () => Effect.succeed(status(NOT_FOUND, "Not Found")),
      onSome: (route) => route(request),
    }),
  );

export const routed = (request: Request): Effect.Effect<Response> => {
  if (writesFromAnotherSite(request)) {
    return Effect.succeed(status(FORBIDDEN, "Forbidden"));
  }
  if (writesWithoutJson(request)) {
    return Effect.succeed(status(UNSUPPORTED_MEDIA_TYPE, "Unsupported Media Type"));
  }
  return served(request);
};
