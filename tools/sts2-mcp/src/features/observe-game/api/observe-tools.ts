import { Effect } from "effect";

import { EMPTY_SCHEMA, INSTANCE_SCHEMA, instanceOf } from "#/entities/request/index.ts";
import type { InstanceRequest } from "#/entities/request/index.ts";
import { Vm, defineTool, recovered, screenshot, state, tunnelTo } from "#/shared/api/index.ts";
import { json, png } from "#/shared/lib/tool-result.ts";

const readState = Effect.fn("tools.readState")(
  function* readState({ instance }: InstanceRequest) {
    const target = instanceOf(instance);
    yield* tunnelTo(target);
    const current = yield* state(target);
    return yield* json(current);
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

/** @internal */
export const observeTools = [
  defineTool({
    name: "sts2_state",
    description:
      "インスタンスの今の状態を返す。画面 (scene・overlays)、ラン (階・プレイヤー・次に進めるマップの点)、戦闘 (手札・エネルギー・敵の意図)、押せる部品 (controls の id・種類・文字) が入る。",
    inputSchema: INSTANCE_SCHEMA,
    handle: readState,
  }),
  defineTool({
    name: "sts2_screenshot",
    description: "インスタンスのウィンドウに描かれた画面を PNG で返す。",
    inputSchema: INSTANCE_SCHEMA,
    handle: capture,
  }),
  defineTool({
    name: "sts2_desktop_screenshot",
    description:
      "VM のデスクトップ全体を PNG で返す。ゲームが落ちた・固まったときや、複数のウィンドウを一度に見るときに使う。",
    inputSchema: EMPTY_SCHEMA,
    handle: desktop,
  }),
];
