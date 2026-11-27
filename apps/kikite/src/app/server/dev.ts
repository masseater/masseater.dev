import { Effect, Fiber, Layer, Option } from "effect";
import type { Plugin } from "vite-plus";

import { DEV_API_PORT } from "#/shared/config/index.ts";

import { serveApi } from "./serve.ts";

export const interviewerDev = (): Plugin => ({
  name: "kikite-interviewer",
  apply: "serve",
  configureServer(server): void {
    Option.map(Option.fromNullishOr(server.httpServer), (httpServer) => {
      const running = serveApi(DEV_API_PORT).pipe(Layer.launch, Effect.runFork);
      httpServer.once("close", () => {
        running.pipe(Fiber.interrupt, Effect.runFork);
      });
      return running;
    });
  },
});

export const DEV_PROXY = { "/api": `http://127.0.0.1:${DEV_API_PORT}` };
