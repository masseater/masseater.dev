import { Effect } from "effect";

import { toolFailed } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";

const attempt =
  (tool: string) =>
  <Value>(run: () => PromiseLike<Value>): Effect.Effect<Value, VpToolsError> =>
    Effect.tryPromise(run).pipe(Effect.mapError(toolFailed(tool)));

export { attempt };
