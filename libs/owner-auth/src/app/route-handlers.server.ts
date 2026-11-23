import { run } from "@r_masseater/workers-tracing/effect";
import { Effect, Function } from "effect";

export type Serve = (request: Request) => Promise<Response>;

export type RequestHandler = (context: Readonly<{ request: Request }>) => Promise<Response>;

export interface FloodLimiter {
  readonly limit: (options: Readonly<{ key: string }>) => Promise<Readonly<{ success: boolean }>>;
}

const CLIENT_IP_HEADER = "cf-connecting-ip";

const UNKNOWN_CALLER = "unknown";

const TOO_MANY_REQUESTS = 429;

const admits = (limiter: FloodLimiter, request: Request): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: () => limiter.limit({ key: request.headers.get(CLIENT_IP_HEADER) ?? UNKNOWN_CALLER }),
    catch: Function.identity,
  }).pipe(
    Effect.map(({ success }) => success),
    Effect.orElseSucceed(() => true),
  );

export const floodGuarded =
  (limiter: FloodLimiter) =>
  (serve: Serve): Serve =>
  (request) =>
    run(
      Effect.if(admits(limiter, request), {
        onTrue: () => Effect.promise(() => serve(request)),
        onFalse: () => Effect.succeed(new Response("", { status: TOO_MANY_REQUESTS })),
      }),
    );

const forRequest =
  (serve: Serve): RequestHandler =>
  ({ request }) =>
    serve(request);

export const mcpHandlers = (
  serve: Serve,
): Readonly<{ GET: RequestHandler; POST: RequestHandler; DELETE: RequestHandler }> => {
  const handle = forRequest(serve);
  return { GET: handle, POST: handle, DELETE: handle };
};

export const authHandlers = (
  serve: Serve,
): Readonly<{ GET: RequestHandler; POST: RequestHandler }> => {
  const handle = forRequest(serve);
  return { GET: handle, POST: handle };
};

export const wellKnownHandlers = (serve: Serve): Readonly<{ GET: RequestHandler }> => ({
  GET: forRequest(serve),
});
