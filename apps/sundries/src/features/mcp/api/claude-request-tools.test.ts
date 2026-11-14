import { expect, it } from "@effect/vitest";
import type { Caller } from "@masseater.dev/mcp-tool-call";
import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  Array as Arr,
  Boolean as Bool,
  Effect,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { closeDatabase, resetDatabase } from "./claude-request-tools.test.support.ts";
import { registerTools } from "./tools";

vi.mock("cloudflare:workers", () => import("./claude-request-tools.test.support.ts"));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

type Args = Readonly<Record<string, unknown>>;

type Called = Readonly<{ isError: boolean; text: string }>;

const MUSE: Caller = { client: "muse", userAgent: "vitest" };

const THREAD: Caller = { client: "claude-code", userAgent: "vitest" };

const THREAD_URL = "https://claude.ai/code/project/p?thread=t";

const MISSING_ID = 99;

const DATA_LINE = /^data: (?<json>.+)$/mu;

const CallResult = Schema.Struct({
  content: Schema.Array(Schema.Struct({ type: Schema.String, text: Schema.String })),
  isError: Schema.optionalKey(Schema.Boolean),
});

const decodeResult = Schema.decodeEffect(
  Schema.fromJsonString(Schema.Struct({ result: CallResult })),
);

const decodeJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown));

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

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

const mcpRequest = (body: string): Request =>
  new Request("https://sundries.masseater.dev/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body,
  });

const payloadOf = (text: string): string =>
  pipe(
    text,
    Str.match(DATA_LINE),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(Rec.get("json")),
    Option.getOrElse(() => text),
  );

const call = (caller: Caller, name: string, args: Args): Effect.Effect<Called> =>
  Effect.gen(function* called() {
    const body = yield* encodeJson({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    });
    const response = yield* Effect.promise(() =>
      createMcpHandler(() => registerTools(caller)).fetch(mcpRequest(body)),
    );
    const text = yield* Effect.promise(() => response.text());
    const { result } = yield* decodeResult(payloadOf(text));
    const joined = pipe(
      result.content,
      Arr.map((item) => item.text),
      Arr.join("\n"),
    );
    return { isError: result.isError ?? false, text: joined };
  }).pipe(Effect.orDie);

const value = (caller: Caller, name: string, args: Args): Effect.Effect<unknown> =>
  call(caller, name, args).pipe(
    Effect.flatMap(({ isError, text }) =>
      Bool.match(isError, {
        onTrue: () => Effect.die(text),
        onFalse: () => decodeJson(text).pipe(Effect.orDie),
      }),
    ),
  );

const send = (text: string): Effect.Effect<number> =>
  value(MUSE, "send_to_claude", { text }).pipe(
    Effect.flatMap(decodeId),
    Effect.map(({ id }) => id),
    Effect.orDie,
  );

const take = value(THREAD, "take_claude_requests", {}).pipe(
  Effect.flatMap(decodeRows),
  Effect.orDie,
);

const list = (args: Args): Effect.Effect<readonly (typeof RequestRow.Type)[]> =>
  value(MUSE, "list_claude_replies", args).pipe(Effect.flatMap(decodeRows), Effect.orDie);

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
    yield* value(THREAD, "reply_to_request", { id, reply: "直した", threadUrl: THREAD_URL });
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
    const result = yield* value(THREAD, "reply_to_request", {
      id: MISSING_ID,
      reply: "直した",
      threadUrl: THREAD_URL,
    });
    expect(result).toStrictEqual({ id: MISSING_ID, replied: false });
  }),
);

it.effect("空の依頼は受け付けない", () =>
  Effect.gen(function* empty() {
    const { isError } = yield* call(MUSE, "send_to_claude", { text: "" });
    const taken = yield* take;
    expect(isError).toBe(true);
    expect(taken).toStrictEqual([]);
  }),
);
