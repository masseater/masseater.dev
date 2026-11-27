import { Effect } from "effect";

import { ACT_SCHEMA, instanceOf } from "#/entities/request/index.ts";
import type { ActRequest } from "#/entities/request/index.ts";
import { act, defineTool, recovered, settle, tunnelTo } from "#/shared/api/index.ts";
import { json } from "#/shared/lib/tool-result.ts";

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

/** @internal */
export const actTool = defineTool({
  name: "sts2_act",
  description:
    'インスタンスを操作し、画面が落ち着いた後の状態と一緒に結果を返す。action は {"_tag":"press","control":"<controls の id>"}・{"_tag":"play_card","card":<手札の index>,"target":<敵の combatId か null>}・{"_tag":"use_potion","slot":<枠>,"target":<combatId か null>}・{"_tag":"end_turn"}・{"_tag":"console","command":"<開発者コンソールのコマンド>"} のどれか。',
  inputSchema: ACT_SCHEMA,
  handle: perform,
});
