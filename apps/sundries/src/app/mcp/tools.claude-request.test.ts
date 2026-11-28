import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Schema, pipe } from "effect";
import { afterAll, beforeEach } from "vite-plus/test";

import {
  call,
  closeDatabase,
  resetDatabase,
  value,
  wakes,
} from "./claude-request-tools.test.support.ts";
import type { Args } from "./claude-request-tools.test.support.ts";

beforeEach(() => {
  wakes.outcome = "rejected";
  wakes.count = 0;
  wakes.projects = [];
  return Effect.runPromise(resetDatabase);
});
afterAll(() => Effect.runPromise(closeDatabase));

const MUSE = "muse";

const THREAD = "claude-code";

const THREAD_URL = "https://claude.ai/code/project/p?thread=t";

const MISSING_ID = 99;

const SENT_ONCE = 1;

const RequestRow = Schema.Struct({
  id: Schema.Int,
  text: Schema.String,
  sender: Schema.String,
  takenAt: Schema.NullOr(Schema.Int),
  threadUrl: Schema.NullOr(Schema.String),
  reply: Schema.NullOr(Schema.String),
});

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(RequestRow));

const decodeId = Schema.decodeUnknownEffect(Schema.Struct({ id: Schema.Int }));

const decodeSent = Schema.decodeUnknownEffect(
  Schema.Struct({ id: Schema.Int, woke: Schema.String }),
);

const send = (text: string): Effect.Effect<number> =>
  value(MUSE)("send_to_claude")({ text }).pipe(
    Effect.flatMap(decodeId),
    Effect.map(({ id }) => id),
    Effect.orDie,
  );

const take = value(THREAD)("take_claude_requests")({}).pipe(
  Effect.flatMap(decodeRows),
  Effect.orDie,
);

const list = (args: Args): Effect.Effect<readonly (typeof RequestRow.Type)[]> =>
  value(MUSE)("list_claude_replies")(args).pipe(Effect.flatMap(decodeRows), Effect.orDie);

it.effect("送った依頼は 1 度だけ、古い順に受け取られる", () =>
  Effect.gen(function* takenOnce() {
    const first = yield* send("記事を直して");
    const second = yield* send("テストを足して");
    const taken = yield* take;
    const again = yield* take;
    expect(
      pipe(
        taken,
        Arr.map(({ id, text, sender }) => ({ id, text, sender })),
      ),
    ).toStrictEqual([
      { id: first, text: "記事を直して", sender: "muse" },
      { id: second, text: "テストを足して", sender: "muse" },
    ]);
    expect(again).toStrictEqual([]);
  }),
);

it.effect("返事とスレッドの URL は送った側の一覧に出る", () =>
  Effect.gen(function* replied() {
    const id = yield* send("記事を直して");
    yield* take;
    yield* value(THREAD)("reply_to_request")({ id, reply: "直した", threadUrl: THREAD_URL });
    const rows = yield* list({});
    expect(rows).toMatchObject([{ id, reply: "直した", threadUrl: THREAD_URL }]);
    expect(
      pipe(
        rows,
        Arr.every(({ takenAt }) => takenAt !== null),
      ),
    ).toBe(true);
  }),
);

it.effect("after を渡すと、その id より後だけを古い順に返す", () =>
  Effect.gen(function* afterId() {
    const first = yield* send("1");
    const second = yield* send("2");
    const third = yield* send("3");
    const rows = yield* list({ after: first });
    expect(
      pipe(
        rows,
        Arr.map(({ id }) => id),
      ),
    ).toStrictEqual([second, third]);
  }),
);

it.effect("無い id への返事は replied: false を返す", () =>
  Effect.gen(function* missing() {
    const result = yield* value(THREAD)("reply_to_request")({
      id: MISSING_ID,
      reply: "直した",
      threadUrl: THREAD_URL,
    });
    expect(result).toStrictEqual({ id: MISSING_ID, replied: false });
  }),
);

it.effect("空の依頼は受け付けない", () =>
  Effect.gen(function* empty() {
    const { isError } = yield* call(MUSE)("send_to_claude")({ text: "" });
    const taken = yield* take;
    expect(isError).toBe(true);
    expect(taken).toStrictEqual([]);
  }),
);

it.effect("送った依頼は未取得のまま残し、本文なしでプロジェクトを起こす", () =>
  Effect.gen(function* woken() {
    wakes.outcome = "fired";
    const sent = yield* value(MUSE)("send_to_claude")({ text: "記事を直して" }).pipe(
      Effect.flatMap(decodeSent),
      Effect.orDie,
    );
    const taken = yield* take;
    expect(sent.woke).toBe("fired");
    expect(wakes.count).toBe(SENT_ONCE);
    expect(
      pipe(
        taken,
        Arr.map(({ id, text }) => ({ id, text })),
      ),
    ).toStrictEqual([{ id: sent.id, text: "記事を直して" }]);
  }),
);

it.effect("起こせなかった依頼は未取得のまま残り、受け取りタスクが拾える", () =>
  Effect.gen(function* rejected() {
    const sent = yield* value(MUSE)("send_to_claude")({ text: "記事を直して" }).pipe(
      Effect.flatMap(decodeSent),
      Effect.orDie,
    );
    const taken = yield* take;
    expect(sent.woke).toBe("rejected");
    expect(
      pipe(
        taken,
        Arr.map(({ id }) => id),
      ),
    ).toStrictEqual([sent.id]);
  }),
);

it.effect("中継のルーティンを broker に登録する", () =>
  Effect.gen(function* registered() {
    const result = yield* value(MUSE)("register_claude_routine")({
      triggerId: "trig_01Test",
      token: "sk-ant-oat01-test",
    });
    expect(result).toStrictEqual({ registered: true });
  }),
);
