import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt } from "@masseater.dev/mcp-tool-call";
import { Effect } from "effect";

const brokerFailed = failedAt("credential broker");

const brokerResponse = (call: () => Promise<Response>): Effect.Effect<Response, UpstreamFailed> =>
  Effect.tryPromise({ try: call, catch: brokerFailed }).pipe(
    Effect.filterOrFail(
      (response) => response.ok,
      (response) => brokerFailed(new Error(`HTTP ${String(response.status)}`)),
    ),
  );

export { brokerFailed, brokerResponse };
