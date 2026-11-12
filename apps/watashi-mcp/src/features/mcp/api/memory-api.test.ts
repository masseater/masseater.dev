import { afterAll, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { vi } from "vite-plus/test";

import type { TokenScope } from "#/features/mcp/model/api-token.table";

import { mintToken } from "./api-token-api.server";
import { serveMemories } from "./conversation-api.server";
import { readMemory } from "./memory-read.server";
import { closeDatabase, resetDatabase } from "./upload.test.support.ts";

vi.mock("cloudflare:workers", () => import("./upload.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const ENDPOINT = "https://watashi.masseater.dev/api/memories";

const OK = 200;
const BAD_REQUEST = 400;
const FORBIDDEN = 403;
const UNPROCESSABLE = 422;
const ONE_REVISION = 1;
const TWO_REVISIONS = 2;

type Reply = Readonly<{ status: number; body: unknown }>;

type Issued = Readonly<{ token: string }>;

const bicycle = {
  project: "個人PJ",
  name: "bicycle",
  description: "自転車の決まり",
  content: "週末だけ乗る",
};

const train = { project: "個人PJ", name: "train", description: "電車", content: "平日に乗る" };

const replyOf = (response: Response): Effect.Effect<Reply> =>
  Effect.promise(() => response.json()).pipe(
    Effect.map((parsed) => ({ status: response.status, body: parsed })),
  );

const put =
  (token: string) =>
  (body: unknown): Effect.Effect<Reply> =>
    Effect.promise(() => Response.json(body).text()).pipe(
      Effect.map(
        (text) =>
          new Request(ENDPOINT, {
            method: "PUT",
            headers: { authorization: `Bearer ${token}` },
            body: text,
          }),
      ),
      Effect.flatMap((request) => Effect.promise(() => serveMemories(request))),
      Effect.flatMap(replyOf),
    );

const issued = (scope: TokenScope): Effect.Effect<Issued> =>
  resetDatabase.pipe(Effect.andThen(mintToken({ scope, label: "test" })), Effect.orDie);

const revisionsOf = (name: string): Effect.Effect<unknown> =>
  readMemory({ project: "個人PJ", name, revisions: true }).pipe(
    Effect.map((read) => read["revisions"]),
    Effect.orDie,
  );

it.effect("memory:write のトークンで作業メモをまとめて書く", () =>
  Effect.gen(function* importsMemos() {
    const { token } = yield* issued("memory:write");
    const reply = yield* put(token)({ memos: [bicycle, train] });
    expect(reply).toStrictEqual({ status: OK, body: { written: ["memory:1", "memory:2"] } });
    const read = yield* readMemory({ project: "個人PJ", name: "train" });
    expect(read).toMatchObject({ items: [{ content: "平日に乗る" }] });
  }),
);

it.effect("同じ内容を送り直してもリビジョンを増やさず、変えた項目だけ書き換える", () =>
  Effect.gen(function* skipsUnchanged() {
    const { token } = yield* issued("memory:write");
    yield* put(token)({ memos: [bicycle] });
    const again = yield* put(token)({ memos: [bicycle] });
    expect(again).toStrictEqual({ status: OK, body: { written: ["memory:1"] } });
    const once = yield* revisionsOf("bicycle");
    expect(once).toHaveLength(ONE_REVISION);
    yield* put(token)({ memos: [{ ...bicycle, content: "毎日乗る" }] });
    const twice = yield* revisionsOf("bicycle");
    expect(twice).toHaveLength(TWO_REVISIONS);
  }),
);

it.effect("書けない要素があれば 422 で理由と書けた ref を返す", () =>
  Effect.gen(function* reportsPartial() {
    const { token } = yield* issued("memory:write");
    const missing = { project: "個人PJ", name: "missing", retract: true, reason: "不要" };
    const reply = yield* put(token)({ memos: [bicycle, missing, train] });
    expect(reply).toMatchObject({
      status: UNPROCESSABLE,
      body: { errorTag: "MemoryNotFound", written: ["memory:1"] },
    });
  }),
);

it.effect("形の違う body は 400 で断る", () =>
  Effect.gen(function* refusesShape() {
    const { token } = yield* issued("memory:write");
    const empty = yield* put(token)({ memos: [] });
    expect(empty.status).toBe(BAD_REQUEST);
    const noContent = yield* put(token)({ memos: [{ project: "個人PJ" }] });
    expect(noContent.status).toBe(BAD_REQUEST);
  }),
);

it.effect("conversation:write のトークンは 403 で断る", () =>
  Effect.gen(function* refusesOtherScope() {
    const { token } = yield* issued("conversation:write");
    const reply = yield* put(token)({ memos: [bicycle] });
    expect(reply).toStrictEqual({ status: FORBIDDEN, body: { error: "insufficient scope" } });
  }),
);
