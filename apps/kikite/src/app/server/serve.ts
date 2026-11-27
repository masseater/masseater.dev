import { serveWeb } from "@masseater.dev/local-server/serve";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/http";

import { agentGenerator } from "#/features/generate-interview/index.ts";

import { routes } from "./routes.ts";

const ANY_HOST = "0.0.0.0";

/** @internal */
export const serveApi = (port: number): Layer.Layer<never> =>
  Layer.effectDiscard(
    Effect.gen(function* serve() {
      const { handler, dispose } = HttpRouter.toWebHandler(
        routes.pipe(Layer.provideMerge(agentGenerator)),
      );
      yield* Effect.addFinalizer(() => Effect.promise(dispose));
      yield* serveWeb({ handler: (request) => handler(request), port, host: ANY_HOST });
    }),
  );
