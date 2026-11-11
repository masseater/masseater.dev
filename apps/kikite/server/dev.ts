import { Effect, Fiber, Layer, Option } from "effect";
import type { Plugin } from "vite-plus";

import { DEV_API_PORT } from "#config";

import { serveApi } from "./serve.ts";

const interviewerDev = (): Plugin => ({
  name: "kikite-interviewer",
  apply: "serve",
  configureServer(server) {
    Option.map(Option.fromNullishOr(server.httpServer), (httpServer) => {
      const running = Effect.runFork(Layer.launch(serveApi(DEV_API_PORT)));
      httpServer.once("close", () => {
        Effect.runFork(Fiber.interrupt(running));
      });
      return running;
    });
  },
});

const DEV_PROXY = { "/api": `http://127.0.0.1:${DEV_API_PORT}` };

export { DEV_PROXY, interviewerDev };
