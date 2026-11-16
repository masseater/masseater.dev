import { expect, it } from "@effect/vitest";
import { McpServer, createMcpHandler } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { fakeGame, gameState } from "./fake-game.test.support.ts";
import type { FakeGame } from "./fake-game.test.support.ts";
import { registerTools } from "./tools.ts";

type Call = Readonly<{ name: string; arguments: Readonly<Record<string, unknown>> }>;

type Outcome = Readonly<{ isError: boolean; text: string }>;

const Content = Schema.Struct({
  type: Schema.String,
  text: Schema.optionalKey(Schema.String),
  data: Schema.optionalKey(Schema.String),
});

const CallResult = Schema.Struct({
  content: Schema.Array(Content),
  isError: Schema.optionalKey(Schema.Boolean),
});

const decodeResult = Schema.decodeEffect(
  Schema.fromJsonString(Schema.Struct({ result: CallResult })),
);

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const DATA_LINE = /^data: (?<json>.+)$/mu;

const HOST_PORT = 47_100;
const SECOND_PORT = 47_101;
const ONE_INSTANCE = 1;
const TWO_INSTANCES = 2;
const FAILED = 1;
const PLAY_FIRST_CARD = { _tag: "play_card", card: 0, target: 2 } as const;

const SETTLING = [
  gameState({ busy: true, frame: 1 }),
  gameState({ scene: "NCombat", frame: 2 }),
  gameState({ scene: "NCombat", frame: 3 }),
];

const callTool = (game: FakeGame, call: Call): Effect.Effect<Outcome> =>
  Effect.gen(function* callToolOnce() {
    const body = yield* encodeJson({ jsonrpc: "2.0", id: 1, method: "tools/call", params: call });
    const response = yield* Effect.promise(() =>
      createMcpHandler(() =>
        registerTools(Effect.runPromiseWith(game.context))(
          new McpServer({ name: "sts2", version: "0.0.0" }),
        ),
      ).fetch(
        new Request("http://localhost/mcp", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
          },
          body,
        }),
      ),
    );
    const text = yield* Effect.promise(() => response.text());
    const json = pipe(
      text,
      Str.match(DATA_LINE),
      Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
      Option.flatMap(Rec.get("json")),
      Option.getOrElse(() => text),
    );
    const { result } = yield* decodeResult(json);
    return {
      isError: result.isError ?? false,
      text: pipe(
        result.content,
        Arr.map((item) => item.text ?? ""),
        Arr.join("\n"),
      ),
    };
  }).pipe(Effect.orDie);

it.live("sts2_state はトンネルを開いてホストのブリッジの状態を返す", () =>
  Effect.gen(function* readsState() {
    const game = fakeGame({ states: [gameState({ scene: "NRun" })] });
    const { isError, text } = yield* callTool(game, { name: "sts2_state", arguments: {} });
    expect(isError).toBe(false);
    expect(text).toContain('"scene":"NRun"');
    expect(game.now().tunnels).toStrictEqual([ONE_INSTANCE]);
    const [request] = game.now().sent;
    expect(request).toMatchObject({ url: `http://127.0.0.1:${String(HOST_PORT)}/state` });
  }),
);

it.live("sts2_act は操作を送り、画面が落ち着くまで待ってから状態を返す", () =>
  Effect.gen(function* acts() {
    const game = fakeGame({ states: SETTLING });
    const { isError, text } = yield* callTool(game, {
      name: "sts2_act",
      arguments: { instance: ONE_INSTANCE, action: PLAY_FIRST_CARD },
    });
    expect(isError).toBe(false);
    expect(text).toMatch(/"message":"done".*"scene":"NCombat"/su);
    const [action, ...polls] = game.now().sent;
    expect(action).toMatchObject({
      url: `http://127.0.0.1:${String(SECOND_PORT)}/action`,
      body: '{"_tag":"play_card","card":0,"target":2}',
    });
    expect(polls.length).toBeGreaterThanOrEqual(game.now().states.length);
    expect(game.now().tunnels).toStrictEqual([TWO_INSTANCES]);
  }),
);

it.live("sts2_launch はゲストのスクリプトが失敗したらトンネルを開かずに出力を返す", () =>
  Effect.gen(function* failsLaunch() {
    const game = fakeGame({ guest: { exitCode: FAILED, output: "build failed" } });
    const { isError, text } = yield* callTool(game, {
      name: "sts2_launch",
      arguments: { instances: TWO_INSTANCES, mods: ["Sample"] },
    });
    expect(isError).toBe(true);
    expect(text).toContain("build failed");
    expect(game.now().tunnels).toStrictEqual([]);
    const [script] = game.now().scripts;
    expect(script).toContain("-Instances 2 -Mods 'Sample' -SkipBuild");
  }),
);

it.live("ブリッジが失敗を返したら isError の結果にする", () =>
  Effect.gen(function* bridgeFails() {
    const game = fakeGame({ failState: true });
    const { isError } = yield* callTool(game, { name: "sts2_state", arguments: {} });
    expect(isError).toBe(true);
  }),
);

it.live("sts2_deploy は ref を取得してビルドだけを行う", () =>
  Effect.gen(function* deploys() {
    const game = fakeGame();
    const { isError } = yield* callTool(game, {
      name: "sts2_deploy",
      arguments: { ref: "claude/topic", mods: ["Sample"] },
    });
    expect(isError).toBe(false);
    const [script] = game.now().scripts;
    expect(script).toContain("fetch --quiet origin 'claude/topic'");
    expect(script).toContain("-BridgeBasePort 47100 -JoinClientIdBase 999 -Instances 1");
    expect(script).toContain("-NoLaunch");
  }),
);
