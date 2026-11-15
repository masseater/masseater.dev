import { AnalyticsEngine, D1, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { ownerMcpAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { RemovalPolicy, Stack } from "alchemy";
import { Build } from "alchemy/Command";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { HOST, MCP_PATH, MCP_URL, SERVER_NAME, TOOL_CALL_DATASET } from "./shirushi.ts";

const worker = Effect.gen(function* worker() {
  const access = yield* ownerMcpAccess({
    id: "ShirushiAccess",
    name: `${PREFIX}access`,
    host: HOST,
    portalServerId: SERVER_NAME,
  });
  const MARKS = yield* D1.Database("Marks", { migrations: "./migrations" }).pipe(
    RemovalPolicy.protect(),
  );
  const TOOL_CALLS = yield* AnalyticsEngine.Dataset("ToolCalls", { dataset: TOOL_CALL_DATASET });
  const client = yield* Build("ClientBuild", {
    command: "vp build",
    outdir: "dist/client",
    memo: false,
  });
  return yield* Workers.Worker("Shirushi", {
    name: `${PREFIX}worker`,
    main: "./worker/shirushi.worker.ts",
    logpush: true,
    domain: HOST,
    workersDev: false,
    env: { MARKS, TOOL_CALLS, ...access },
    assets: {
      directory: client.outdir,
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*", MCP_PATH],
    },
  });
});

export type WorkerEnv = InferEnv<typeof worker>;

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const { url } = yield* worker;
    yield* requireAppPrefix;
    return { url, mcp: MCP_URL };
  }),
);
