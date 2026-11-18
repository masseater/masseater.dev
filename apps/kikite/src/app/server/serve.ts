import { createServer } from "node:http";

import { layer as nodeHttpServer } from "@effect/platform-node/NodeHttpServer";
import { Layer } from "effect";
import type { HttpServerError } from "effect/http";
import { HttpRouter } from "effect/http";

import { agentGenerator } from "#/features/generate-interview/index.ts";

import { routes } from "./routes.ts";

const ANY_HOST = "0.0.0.0";

/** @internal */
export const serveApi = (port: number): Layer.Layer<never, HttpServerError.ServeError> =>
  HttpRouter.serve(routes).pipe(
    Layer.provide(agentGenerator),
    Layer.provide(nodeHttpServer(createServer, { port, host: ANY_HOST })),
  );
