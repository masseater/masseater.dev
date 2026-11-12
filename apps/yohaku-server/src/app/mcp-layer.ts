import { createServer } from "node:http";

import { NodeHttpServer } from "@effect/platform-node";
import { HOST } from "@masseater.dev/local-server";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/http";

import { Settings } from "#shared/settings";

import { mcpEndpointLayer } from "./mcp-endpoint.ts";
import { mcpRoute } from "./mcp-route.ts";
import { mcpTokenLayer } from "./mcp-token.ts";
import { syncLayer, syncRoute } from "./sync-route.ts";

interface Listening {
  readonly mcpPort: number;
}

const serving = HttpRouter.serve(Layer.mergeAll(mcpRoute, syncRoute), {
  disableListenLog: true,
  disableLogger: true,
});

const httpServerFor = ({ mcpPort }: Listening): ReturnType<typeof NodeHttpServer.layer> =>
  NodeHttpServer.layer(createServer, { host: HOST, port: mcpPort });

const httpServer = Layer.unwrap(Settings.pipe(Effect.map(httpServerFor)));

/** @internal */
const mcpLayer = Layer.mergeAll(serving, mcpEndpointLayer).pipe(
  Layer.provide(httpServer),
  Layer.provideMerge(mcpTokenLayer),
  Layer.provideMerge(syncLayer),
);

export { mcpLayer };
