import { run } from "@r_masseater/workers-tracing/effect";
import { Effect, Schema } from "effect";

export type Serve = (request: Request) => Promise<Response>;

export type RequestHandler = (context: Readonly<{ request: Request }>) => Promise<Response>;

export interface FloodLimiter {
  readonly limit: (options: Readonly<{ key: string }>) => Promise<Readonly<{ success: boolean }>>;
}

const CLIENT_IP_HEADER = "cf-connecting-ip";

const UNKNOWN_CALLER = "unknown";

const TOO_MANY_REQUESTS = 429;

const taggedError = Schema.TaggedError;

class LimiterUnavailable extends taggedError<
  LimiterUnavailable,
  { readonly brand: unique symbol }
>()("LimiterUnavailable", { message: Schema.String }) {}

const admits = (limiter: FloodLimiter, request: Request): Effect.Effect<boolean> =>
  Effect.tryPromise({
    try: () => limiter.limit({ key: request.headers.get(CLIENT_IP_HEADER) ?? UNKNOWN_CALLER }),
    catch: (cause) => LimiterUnavailable.make({ message: String(cause) }),
  }).pipe(
    Effect.map(({ success }) => success),
    Effect.orElseSucceed(() => true),
  );

export const floodGuarded =
  (limiter: FloodLimiter) =>
  (serve: Serve): Serve =>
  (request) =>
    run(
      Effect.gen(function* guarded() {
        const admitted = yield* admits(limiter, request);
        if (!admitted) {
          return new Response("", { status: TOO_MANY_REQUESTS });
        }
        return yield* Effect.promise(() => serve(request));
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
