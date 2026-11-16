import {
  Action,
  ActionResult,
  BRIDGE_BASE_PORT,
  GameState,
  JOIN_CLIENT_ID_BASE,
} from "@masseater.dev/sts2-protocol";
import { Array, Effect } from "effect";

import { csharpTypes } from "#/shared/lib/json-schema-csharp.ts";

const NAMESPACE = "AgentBridge.Protocol";

const constants: readonly string[] = [
  `namespace ${NAMESPACE}`,
  "{",
  "    public static class Ports",
  "    {",
  `        public const int Base = ${BRIDGE_BASE_PORT};`,
  `        public const int JoinClientIdBase = ${JOIN_CLIENT_ID_BASE};`,
  "    }",
  "}",
];

export const sts2 = Effect.fn("sts2")(function* sts2() {
  const { lines } = yield* csharpTypes({
    namespace: NAMESPACE,
    framework: "SystemTextJson",
    roots: () => [
      { name: "GameStateRoot", object: true, ast: GameState.ast },
      { name: "ActionRoot", object: false, ast: Action.ast },
      { name: "ActionResultRoot", object: true, ast: ActionResult.ast },
    ],
  });
  return Array.join([...lines, "", ...constants, ""], "\n");
});
