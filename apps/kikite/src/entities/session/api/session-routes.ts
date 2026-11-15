import { Clock, Effect, Option, Schema, String as Str, pipe } from "effect";

import type { StoreFailed } from "#/entities/session/model/store-failed.ts";
import { SESSIONS_PATH, SessionId, SessionListing, SessionRecord } from "#protocol";

import { allRecords, listSessions, readSession, storeSession } from "./session-store.ts";

type Handler = (
  request: Request,
  id: string,
) => Effect.Effect<Response, Schema.SchemaError | StoreFailed>;

const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const SERVER_ERROR = 500;
const ONE = `${SESSIONS_PATH}/`;
const ALL = `${SESSIONS_PATH}/all`;

const ExportedSession = Schema.Struct({ id: Schema.String, record: SessionRecord });

const decodeId = Schema.decodeUnknownEffect(SessionId);
const encodeListing = Schema.encodeEffect(Schema.fromJsonString(Schema.Array(SessionListing)));
const decodeRecord = Schema.decodeUnknownEffect(Schema.fromJsonString(SessionRecord));
const encodeExport = Schema.encodeEffect(Schema.fromJsonString(Schema.Array(ExportedSession)));

const status = (code: number, text: string): Response => new Response(text, { status: code });

const notFound = (): Effect.Effect<Response> => Effect.succeed(status(NOT_FOUND, "Not Found"));

const badRequest = (): Effect.Effect<Response> =>
  Effect.succeed(status(BAD_REQUEST, "Bad Request"));

const storeFailed = ({ message }: Readonly<{ message: string }>): Effect.Effect<Response> =>
  Effect.logError("kikite.sessionStoreFailed", { message }).pipe(
    Effect.as(status(SERVER_ERROR, "Server Error")),
  );

const json = (body: string): Response =>
  new Response(body, { headers: { "Content-Type": "application/json" } });

const listed = listSessions.pipe(Effect.flatMap(encodeListing), Effect.map(json));

const exported = allRecords.pipe(
  Effect.flatMap(
    Effect.forEach(({ id, record }) =>
      Effect.map(decodeRecord(record), (decoded) => ({ id, record: decoded })),
    ),
  ),
  Effect.flatMap(encodeExport),
  Effect.map(json),
);

const fetched: Handler = (_request, id) =>
  readSession(id).pipe(
    Effect.map(
      Option.match({
        onNone: () => status(NOT_FOUND, "Not Found"),
        onSome: json,
      }),
    ),
  );

const stored: Handler = Effect.fn("kikite.storeSession")(function* stored(request, id) {
  const text = yield* Effect.promise(() => request.text());
  const record = yield* decodeRecord(text);
  const updatedAt = yield* Clock.currentTimeMillis;
  yield* storeSession({
    id,
    startedAt: record.startedAt,
    updatedAt,
    theme: Option.match(record.summary, { onNone: () => "", onSome: ({ theme }) => theme }),
    entries: record.entries.length,
    record: text,
  });
  return Response.json({ id, updatedAt });
});

const ONE_ROUTES: ReadonlyMap<string, Handler> = new Map([
  ["GET", fetched],
  ["PUT", stored],
]);

const oneSession = (
  request: Request,
  raw: string,
): Effect.Effect<Response, Schema.SchemaError | StoreFailed> =>
  Option.match(Option.fromUndefinedOr(ONE_ROUTES.get(request.method)), {
    onNone: notFound,
    onSome: (handler) => decodeId(raw).pipe(Effect.flatMap((id) => handler(request, id))),
  });

const idIn = (pathname: string): Option.Option<string> =>
  pipe(Option.liftPredicate(pathname, Str.startsWith(ONE)), Option.map(Str.slice(ONE.length)));

const answered = (request: Request): Effect.Effect<Response, Schema.SchemaError | StoreFailed> => {
  const { pathname } = new URL(request.url);
  if (pathname === SESSIONS_PATH && request.method === "GET") {
    return listed;
  }
  if (pathname === ALL && request.method === "GET") {
    return exported;
  }
  return Option.match(idIn(pathname), {
    onNone: notFound,
    onSome: (raw) => oneSession(request, raw),
  });
};

export const sessionRoutes = (request: Request): Effect.Effect<Response> =>
  answered(request).pipe(Effect.catchTags({ SchemaError: badRequest, StoreFailed: storeFailed }));

export const isSessionsPath = (pathname: string): boolean =>
  pathname === SESSIONS_PATH || Str.startsWith(ONE)(pathname);
