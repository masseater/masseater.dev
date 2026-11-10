import { Effect } from "effect";

import { toolFailed } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";

const attempt =
  (tool: string) =>
  <Value>(run: () => PromiseLike<Value>): Effect.Effect<Value, VpToolsError> =>
    Effect.tryPromise({ try: run, catch: toolFailed(tool) });

export { attempt };
