import { afterAll, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { vi } from "vite-plus/test";

import { mintToken, revokeToken } from "./api-token-api.server";
import { serveConversations } from "./conversation-api.server";
import {
  closeDatabase,
  env,
  objects,
  points,
  refusedPuts,
  resetDatabase,
} from "./upload.test.support.ts";

vi.mock("cloudflare:workers", () => import("./upload.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const ENDPOINT = "https://watashi.masseater.dev/api/conversations";

const FILE = "kind=claude-code&session=session-1&file=main";

const FIRST_OBJECT = "claude-code/session-1/main/000000000000-10.jsonl.gz";

const GZIP_FIRST = 31;
const GZIP_SECOND = 139;

const GZIP = new Uint8Array([GZIP_FIRST, GZIP_SECOND]);

const OK = 200;
const UNAUTHORIZED = 401;
const CONFLICT = 409;
const SERVER_ERROR = 500;
const NO_OBJECTS = 0;
const LAST = -1;
const ONE_OBJECT = 1;

const REFUSE_CHUNKS = `CREATE TRIGGER refuse_chunks BEFORE INSERT ON conversation_chunk
BEGIN SELECT RAISE(ABORT, 'refused by the test'); END`;

type Reply = Readonly<{ status: number; body: unknown }>;

const sql = (statement: string): Effect.Effect<unknown> =>
  Effect.promise(() => env.DB.prepare(statement).run());

const replyOf = (response: Response): Effect.Effect<Reply> =>
  Effect.promise(() => response.json()).pipe(
    Effect.map((body) => ({ status: response.status, body })),
  );

const send = (request: Request): Effect.Effect<Reply> =>
  Effect.promise(() => serveConversations(request)).pipe(Effect.flatMap(replyOf));

const authorized = (token: string): HeadersInit => ({ authorization: `Bearer ${token}` });

const offsetWith = (token: string): Effect.Effect<Reply> =>
  send(new Request(`${ENDPOINT}?${FILE}`, { headers: authorized(token) }));

const chunk = (token: string, range: Readonly<{ start: number; end: number }>): Request =>
  new Request(
    `${ENDPOINT}?${FILE}&start=${range.start}&end=${range.end}&redactions=0&cwd=%2Fhome&source=cli&remoteSession=`,
    { method: "PUT", headers: authorized(token), body: GZIP },
  );

const FIRST = { start: 0, end: 10 };

const issued = Effect.sync(() => {
  objects.clear();
  refusedPuts.clear();
  points.splice(NO_OBJECTS);
}).pipe(
  Effect.andThen(resetDatabase),
  Effect.andThen(mintToken({ scope: "conversation:write", label: "test" })),
);

it.effect("知らないトークンは 401 で断る", () =>
  Effect.gen(function* refusesUnknownToken() {
    yield* issued;
    const reply = yield* offsetWith("wat_unknown");
    expect(reply).toStrictEqual({ status: UNAUTHORIZED, body: { error: "invalid token" } });
  }),
);

it.effect("取り消したトークンは 401 で断る", () =>
  Effect.gen(function* refusesRevokedToken() {
    const { id, token } = yield* issued;
    yield* revokeToken(new Request(`https://watashi.masseater.dev/api/tokens?id=${id}`));
    const reply = yield* offsetWith(token);
    expect(reply).toStrictEqual({ status: UNAUTHORIZED, body: { error: "invalid token" } });
  }),
);

it.effect("有効なトークンは通し、保存済みの末尾を返す", () =>
  Effect.gen(function* acceptsToken() {
    const { token } = yield* issued;
    const before = yield* offsetWith(token);
    expect(before).toStrictEqual({ status: OK, body: { committed: FIRST.start } });
    const stored = yield* send(chunk(token, FIRST));
    expect(stored).toStrictEqual({ status: OK, body: { committed: FIRST.end } });
    expect([...objects.keys()]).toStrictEqual([FIRST_OBJECT]);
  }),
);

it.effect("start が保存済みの末尾と違えば、409 で末尾を返す", () =>
  Effect.gen(function* refusesWrongOffset() {
    const { token } = yield* issued;
    yield* send(chunk(token, FIRST));
    const again = yield* send(chunk(token, FIRST));
    expect(again).toStrictEqual({ status: CONFLICT, body: { expected: FIRST.end } });
    expect(objects.size).toBe(ONE_OBJECT);
  }),
);

it.effect("R2 に置けなければ storage failed を返し、何も確定しない", () =>
  Effect.gen(function* reportsPutFailure() {
    const { token } = yield* issued;
    refusedPuts.add(FIRST_OBJECT);
    const reply = yield* send(chunk(token, FIRST));
    expect(reply).toStrictEqual({ status: SERVER_ERROR, body: { error: "storage failed" } });
    expect(points.at(LAST)).toMatchObject({ indexes: ["error"] });
    const after = yield* offsetWith(token);
    expect(after).toStrictEqual({ status: OK, body: { committed: FIRST.start } });
  }),
);

it.effect("D1 に記録できなければ、置いたオブジェクトを消す", () =>
  Effect.gen(function* discardsOrphan() {
    const { token } = yield* issued;
    yield* sql(REFUSE_CHUNKS);
    const reply = yield* send(chunk(token, FIRST));
    yield* sql("DROP TRIGGER refuse_chunks");
    expect(reply).toStrictEqual({ status: SERVER_ERROR, body: { error: "storage failed" } });
    expect(objects.size).toBe(NO_OBJECTS);
  }),
);
