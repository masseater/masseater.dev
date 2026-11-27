import { Effect } from "effect";
import type { Scope } from "effect";
import { serve } from "srvx";

export type WebHandler = (request: Request) => Promise<Response>;

export const serveWeb = ({
  handler,
  port,
  host,
}: Readonly<{ handler: WebHandler; port: number; host: string }>): Effect.Effect<
  URL,
  never,
  Scope.Scope
> =>
  Effect.acquireRelease(
    Effect.promise(() =>
      serve({
        fetch: handler,
        port,
        hostname: host,
        silent: true,
        gracefulShutdown: false,
      }).ready(),
    ),
    (server) => Effect.promise(() => server.close(true)),
  ).pipe(Effect.map(({ url }) => new URL(url ?? `http://${host}:${String(port)}`)));
