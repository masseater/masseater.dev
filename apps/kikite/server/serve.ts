import { createServer } from "node:http";

import { NodeHttpServer } from "@effect/platform-node";
import { Layer } from "effect";
import type { HttpServerError } from "effect/http";
import { HttpRouter } from "effect/http";

import { agentGenerator } from "./generator.ts";
import { routes } from "./routes.ts";

const ANY_HOST = "0.0.0.0";

const serveApi = (port: number): Layer.Layer<never, HttpServerError.ServeError> =>
  HttpRouter.serve(routes).pipe(
    Layer.provide(agentGenerator),
    Layer.provide(NodeHttpServer.layer(createServer, { port, host: ANY_HOST })),
  );

/** @internal */
export { serveApi };
