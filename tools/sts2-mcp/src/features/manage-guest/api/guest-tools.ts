import type { GameStateType } from "@masseater.dev/sts2-protocol";
import type { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, pipe } from "effect";

import {
  DEFAULT_LOG_LINES,
  DEFAULT_REF,
  DEPLOY_SCHEMA,
  EMPTY_SCHEMA,
  LAUNCH_SCHEMA,
  LOGS_SCHEMA,
  MIN_INSTANCES,
  instanceOf,
} from "#/entities/request/index.ts";
import type { DeployRequest, LaunchRequest, LogsRequest } from "#/entities/request/index.ts";
import {
  deployScript,
  launchScript,
  logScript,
  stopScript,
} from "#/features/manage-guest/model/guest-scripts.ts";
import { Vm, fromOutput, guest, recovered, waitReady } from "#/shared/api/index.ts";
import type { Runner, Services } from "#/shared/api/index.ts";
import { Sts2Failed } from "#/shared/lib/errors.ts";
import { text } from "#/shared/lib/tool-result.ts";

const SUCCESS = 0;
const NO_MODS: readonly string[] = [];

const modsOf = (mods: readonly string[] | undefined): readonly string[] => mods ?? NO_MODS;

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

const logs = Effect.fn("tools.logs")(
  function* logs({ instance, lines }: LogsRequest) {
    return yield* guest(
      logScript({ instance: instanceOf(instance), lines: lines ?? DEFAULT_LOG_LINES }),
    );
  },
  Effect.catchTag("Sts2Failed", recovered),
);

/** @internal */
export const registerGuestTools =
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
