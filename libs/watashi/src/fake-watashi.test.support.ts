import { CONVERSATIONS_PATH } from "@masseater.dev/watashi-protocol";
import { Array as Arr, Effect, Option, Record as Rec, Ref, String as Str, pipe } from "effect";
import { Headers, HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from "effect/http";

type Query = Readonly<Record<string, string>>;

type Stored = Readonly<{ start: number; end: number; body: string; query: Query }>;

type Recorded = Readonly<{ method: string; path: string; authorization: string }>;

type State = Readonly<{
  requests: readonly Recorded[];
  chunks: Readonly<Record<string, readonly Stored[]>>;
  conflictNext: boolean;
}>;

type FakeWatashi = Readonly<{
  client: HttpClient.HttpClient;
  count: (method: string) => number;
  requests: () => readonly Recorded[];
  chunksOf: (key: string) => readonly Stored[];
  text: (key: string) => string;
  firstQuery: (key: string) => (name: string) => Option.Option<string>;
  conflictOnce: Effect.Effect<void>;
}>;

const CONFLICT = 409;
const NOT_FOUND = 404;
const NONE = 0;

const queryOf = (request: HttpClientRequest.HttpClientRequest): Query =>
  Rec.fromEntries(new URLSearchParams(UrlParams.toString(request.urlParams)));

const gunzip = (bytes: Uint8Array): Effect.Effect<string> =>
  Effect.promise(() => {
    const blob = new Blob([new Uint8Array(bytes)]);
    return new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text();
  });

const bodyOf = (request: HttpClientRequest.HttpClientRequest): Effect.Effect<string> =>
  HttpClientRequest.toWeb(request).pipe(
    Effect.flatMap((web) => Effect.promise(() => web.bytes())),
    Effect.flatMap(gunzip),
    Effect.orDie,
  );

const field = (query: Query, name: string): string =>
  Option.getOrElse(Rec.get(query, name), () => "");

const keyOf = (query: Query): string =>
  `${field(query, "kind")}/${field(query, "session")}/${field(query, "file")}`;

const chunksIn =
  (state: State) =>
  (key: string): readonly Stored[] =>
    Option.getOrElse(Rec.get(state.chunks, key), () => []);

const committedIn = (state: State, key: string): number =>
  pipe(
    Arr.last(chunksIn(state)(key)),
    Option.map((chunk) => chunk.end),
    Option.getOrElse(() => NONE),
  );

const stored = (state: State, query: Query, body: string): readonly [Response, State] => {
  const key = keyOf(query);
  const start = Number(field(query, "start"));
  const expected = committedIn(state, key);
  if (state.conflictNext || start !== expected) {
    return [Response.json({ expected }, { status: CONFLICT }), { ...state, conflictNext: false }];
  }
  const end = Number(field(query, "end"));
  const chunks = { ...state.chunks, [key]: [...chunksIn(state)(key), { start, end, body, query }] };
  return [Response.json({ committed: end }), { ...state, chunks }];
};

const respond = (
  ref: Ref.Ref<State>,
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<Response> => {
  const query = queryOf(request);
  if (request.method === "GET") {
    return Ref.get(ref).pipe(
      Effect.map((state) => committedIn(state, keyOf(query))),
      Effect.map((committed) => Response.json({ committed })),
    );
  }
  return bodyOf(request).pipe(
    Effect.flatMap((body) => Ref.modify(ref, (state) => stored(state, query, body))),
  );
};

const record = (
  ref: Ref.Ref<State>,
  request: HttpClientRequest.HttpClientRequest,
): Effect.Effect<string> => {
  const path = new URL(request.url).pathname;
  const authorization = Option.getOrElse(Headers.get(request.headers, "authorization"), () => "");
  const recorded = { method: request.method, path, authorization };
  return Ref.update(ref, (state) => ({ ...state, requests: [...state.requests, recorded] })).pipe(
    Effect.as(path),
  );
};

const clientOf = (ref: Ref.Ref<State>): HttpClient.HttpClient =>
  HttpClient.make((request) =>
    record(ref, request).pipe(
      Effect.flatMap((path) => {
        if (path !== CONVERSATIONS_PATH) {
          return Effect.succeed(new Response("not found", { status: NOT_FOUND }));
        }
        return respond(ref, request);
      }),
      Effect.map((response) => HttpClientResponse.fromWeb(request, response)),
    ),
  );

const fakeWatashi = (): FakeWatashi => {
  const ref = Ref.makeUnsafe<State>({ requests: [], chunks: {}, conflictNext: false });
  const now = (): State => Ref.getUnsafe(ref);
  const chunksOf = (key: string): readonly Stored[] => chunksIn(now())(key);
  const firstQuery =
    (key: string) =>
    (name: string): Option.Option<string> =>
      Arr.head(chunksOf(key)).pipe(Option.flatMap((chunk) => Rec.get(chunk.query, name)));
  return {
    client: clientOf(ref),
    count: (method) =>
      pipe(
        now().requests,
        Arr.filter((request) => request.method === method),
      ).length,
    requests: () => now().requests,
    chunksOf,
    text: (key) =>
      pipe(
        chunksOf(key),
        Arr.map((chunk) => chunk.body),
        Arr.join(""),
      ),
    firstQuery,
    conflictOnce: Ref.update(ref, (state) => ({ ...state, conflictNext: true })),
  };
};

const endsWithNewline = (chunk: Stored): boolean => Str.endsWith("\n")(chunk.body);

/** @internal */
export { endsWithNewline, fakeWatashi };
/** @internal */
export type { FakeWatashi, Query, Recorded, Stored };
