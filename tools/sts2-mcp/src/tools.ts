import type { GameStateType } from "@masseater.dev/sts2-protocol";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Schema, pipe } from "effect";
import type { HttpClient } from "effect/http";

import { act, screenshot, settle, state, waitReady } from "./bridge.ts";
import { Sts2Failed } from "./errors.ts";
import { deployScript, launchScript, logScript, stopScript } from "./guest-scripts.ts";
import {
  ACT_SCHEMA,
  DEFAULT_LOG_LINES,
  DEFAULT_REF,
  DEPLOY_SCHEMA,
  EMPTY_SCHEMA,
  HOST_INSTANCE,
  INSTANCE_SCHEMA,
  LAUNCH_SCHEMA,
  LOGS_SCHEMA,
  MIN_INSTANCES,
} from "./inputs.ts";
import type {
  ActRequest,
  DeployRequest,
  InstanceRequest,
  LaunchRequest,
  LogsRequest,
} from "./inputs.ts";
import { Vm } from "./vm.ts";
import type { Output } from "./vm.ts";

/** @internal */
export type Services = Vm | HttpClient.HttpClient;

/** @internal */
export type Runner = (
  effect: Effect.Effect<CallToolResult, never, Services>,
) => Promise<CallToolResult>;

const SUCCESS = 0;
const NO_MODS: readonly string[] = [];
const PNG = "image/png";

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const text = (value: string): CallToolResult => ({ content: [{ type: "text", text: value }] });

const failure = (value: string): CallToolResult => ({ ...text(value), isError: true });

const json = (value: unknown): Effect.Effect<CallToolResult> =>
  encodeJson(value).pipe(Effect.map(text), Effect.orDie);

const png = (bytes: Uint8Array): CallToolResult => ({
  content: [
    { type: "image", data: globalThis.Buffer.from(bytes).toString("base64"), mimeType: PNG },
  ],
});

const fromOutput = ({ exitCode, output }: Output): CallToolResult => {
  const result = text(`exit ${String(exitCode)}\n${output}`);
  if (exitCode === SUCCESS) {
    return result;
  }
  return { ...result, isError: true };
};

const instanceOf = (instance: number | undefined): number => instance ?? HOST_INSTANCE;

const modsOf = (mods: readonly string[] | undefined): readonly string[] => mods ?? NO_MODS;

const tunnelTo = Effect.fn("tools.tunnelTo")(function* tunnelTo(instance: number) {
  const vm = yield* Vm;
  yield* vm.openTunnel(instance + MIN_INSTANCES);
});

const recovered = ({ message }: Readonly<{ message: string }>): Effect.Effect<CallToolResult> =>
  Effect.succeed(failure(message));

const guest = Effect.fn("tools.guest")(function* guest(script: string) {
  const vm = yield* Vm;
  const output = yield* vm.guest(script);
  return fromOutput(output);
});

const deploy = Effect.fn("tools.deploy")(
  function* deploy({ ref, mods }: DeployRequest) {
    return yield* guest(deployScript({ ref: ref ?? DEFAULT_REF, mods: modsOf(mods) }));
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const summary = (states: readonly GameStateType[]): string =>
  pipe(
    states,
    Arr.map(
      (game, instance) =>
        `instance ${String(instance)}: port ${String(game.bridge.port)} scene ${game.scene}`,
    ),
    Arr.join("\n"),
  );

const allReady = (count: number): Effect.Effect<readonly GameStateType[], Sts2Failed, Services> =>
  Effect.forEach(Arr.makeBy(count, Number), waitReady, { concurrency: "unbounded" });

const launch = Effect.fn("tools.launch")(
  function* launch({ instances, mods }: LaunchRequest) {
    const count = instances ?? MIN_INSTANCES;
    const vm = yield* Vm;
    const output = yield* vm.guest(launchScript({ instances: count, mods: modsOf(mods) }));
    if (output.exitCode !== SUCCESS) {
      return fromOutput(output);
    }
    const states = yield* vm.openTunnel(count).pipe(
      Effect.andThen(allReady(count)),
      Effect.mapError(({ message }) =>
        Sts2Failed.make({ message: `${output.output}\n${message}` }),
      ),
    );
    return text(`${output.output}\n${summary(states)}`);
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const stop = Effect.fn("tools.stop")(
  function* stop() {
    return yield* guest(stopScript);
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const readState = Effect.fn("tools.readState")(
  function* readState({ instance }: InstanceRequest) {
    const target = instanceOf(instance);
    yield* tunnelTo(target);
    const current = yield* state(target);
    return yield* json(current);
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const perform = Effect.fn("tools.perform")(
  function* perform({ instance, action }: ActRequest) {
    const target = instanceOf(instance);
    yield* tunnelTo(target);
    const result = yield* act({ instance: target, action });
    const after = yield* settle(target);
    return yield* json({ result, state: after });
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const capture = Effect.fn("tools.capture")(
  function* capture({ instance }: InstanceRequest) {
    const target = instanceOf(instance);
    yield* tunnelTo(target);
    const bytes = yield* screenshot(target);
    return png(bytes);
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const desktop = Effect.fn("tools.desktop")(
  function* desktop() {
    const vm = yield* Vm;
    const bytes = yield* vm.desktopScreenshot;
    return png(bytes);
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const logs = Effect.fn("tools.logs")(
  function* logs({ instance, lines }: LogsRequest) {
    return yield* guest(
      logScript({ instance: instanceOf(instance), lines: lines ?? DEFAULT_LOG_LINES }),
    );
  },
  Effect.catchTag("Sts2Failed", recovered),
);

const registerVmTools =
  (run: Runner) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "sts2_deploy",
      {
        description:
          "VM のゲストで masseater.dev を指定の ref (既定は main) にして、AgentBridge と指定の mod をビルドしてゲームに入れる。ref は先に push しておく。起動中のゲームは閉じる。",
        inputSchema: DEPLOY_SCHEMA,
      },
      (input) => deploy(input).pipe(run),
    );
    server.registerTool(
      "sts2_launch",
      {
        description:
          "ゲームを起動し、各インスタンスの AgentBridge が応答するまで待つ。instances が 2 以上なら同じ VM で多重起動して協力プレイにつなぐ (0 がホスト)。",
        inputSchema: LAUNCH_SCHEMA,
      },
      (input) => launch(input).pipe(run),
    );
    server.registerTool(
      "sts2_stop",
      { description: "VM の中のゲームをすべて閉じる。", inputSchema: EMPTY_SCHEMA },
      () => stop().pipe(run),
    );
    server.registerTool(
      "sts2_logs",
      {
        description:
          "インスタンスのゲームのログ (godot.log) の末尾を返す。mod の例外や読み込みの結果を見る。",
        inputSchema: LOGS_SCHEMA,
      },
      (input) => logs(input).pipe(run),
    );
    return server;
  };

const registerGameTools =
  (run: Runner) =>
  (server: McpServer): McpServer => {
    server.registerTool(
      "sts2_state",
      {
        description:
          "インスタンスの今の状態を返す。画面 (scene・overlays)、ラン (階・プレイヤー・次に進めるマップの点)、戦闘 (手札・エネルギー・敵の意図)、押せる部品 (controls の id・種類・文字) が入る。",
        inputSchema: INSTANCE_SCHEMA,
      },
      (input) => readState(input).pipe(run),
    );
    server.registerTool(
      "sts2_act",
      {
        description:
          'インスタンスを操作し、画面が落ち着いた後の状態と一緒に結果を返す。action は {"_tag":"press","control":"<controls の id>"}・{"_tag":"play_card","card":<手札の index>,"target":<敵の combatId か null>}・{"_tag":"use_potion","slot":<枠>,"target":<combatId か null>}・{"_tag":"end_turn"}・{"_tag":"console","command":"<開発者コンソールのコマンド>"} のどれか。',
        inputSchema: ACT_SCHEMA,
      },
      (input) => perform(input).pipe(run),
    );
    server.registerTool(
      "sts2_screenshot",
      {
        description: "インスタンスのウィンドウに描かれた画面を PNG で返す。",
        inputSchema: INSTANCE_SCHEMA,
      },
      (input) => capture(input).pipe(run),
    );
    server.registerTool(
      "sts2_desktop_screenshot",
      {
        description:
          "VM のデスクトップ全体を PNG で返す。ゲームが落ちた・固まったときや、複数のウィンドウを一度に見るときに使う。",
        inputSchema: EMPTY_SCHEMA,
      },
      () => desktop().pipe(run),
    );
    return server;
  };

/** @internal */
export const registerTools =
  (run: Runner) =>
  (server: McpServer): McpServer =>
    pipe(server, registerVmTools(run), registerGameTools(run));
