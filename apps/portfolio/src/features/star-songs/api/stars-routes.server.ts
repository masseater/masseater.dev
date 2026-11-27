import { run } from "@r_masseater/workers-tracing/effect";
import { Elysia } from "@r_masseater/workers-tracing/elysia";
import { Effect, Option, Schema, pipe } from "effect";
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { categories } from "#/entities/entry/index.ts";
import { site } from "#/shared/config/index.ts";

import { StarSite } from "./star-site.server.ts";
import type { StarBindings } from "./star-site.server.ts";
import { StarsDb, addStar, read, readCounts, removeStar, starsDbOf } from "./stars-store.server.ts";
import type { Change, Counts, Stars, Target } from "./stars-store.server.ts";
import { flooded, visitorOf } from "./visitor.server.ts";

const Slug = Schema.String.check(Schema.isPattern(/^[\w-]+$/u));

const TargetSchema = Schema.Struct({ category: Schema.Literals(categories), slug: Slug });

const decodeTarget = Schema.decodeUnknownOption(TargetSchema);

const decodeCategory = Schema.decodeUnknownOption(
  Schema.Struct({ category: Schema.Literals(categories) }),
);

const missing: Stars = { status: "missing" };

const TOO_MANY = 429;

type TooMany = ElysiaCustomStatusResponse<typeof TOO_MANY, "too many requests">;

const exists = Effect.fn("stars.exists")(function* exists(request: Request, target: Target) {
  const { ASSETS } = yield* StarSite;
  const url = new URL(`/${target.category}/${target.slug}`, request.url);
  const response = yield* Effect.promise(() => ASSETS.fetch(url.href, { method: "HEAD" }));
  return response.ok;
});

const changed = Effect.fn("stars.change")(function* changed(
  request: Request,
  target: Target,
  change: Change,
) {
  if (!(yield* exists(request, target))) {
    return missing;
  }
  const visitor = yield* visitorOf(request);
  yield* change(target, visitor);
  return yield* read(target, visitor);
});

type Needs = StarSite | StarsDb;

const missingCounts: Counts = { status: "missing" };

const bindingsOf = new WeakMap<Request, StarBindings>();

const withBindings =
  <Value>(effect: Effect.Effect<Value, never, Needs>) =>
  (bindings: StarBindings): Effect.Effect<Value> =>
    effect.pipe(
      Effect.provideService(StarSite, bindings),
      Effect.provideService(StarsDb, starsDbOf(bindings.STARS)),
    );

const bindingsFor = (request: Request): Effect.Effect<StarBindings> =>
  pipe(bindingsOf.get(request), Option.fromUndefinedOr, Effect.fromOption, Effect.orDie);

const provided = <Value>(
  request: Request,
  effect: Effect.Effect<Value, never, Needs>,
): Promise<Value> => run(Effect.flatMap(bindingsFor(request), withBindings(effect)));

const answered = (
  effect: (target: Target) => Effect.Effect<Stars, never, Needs>,
  params: unknown,
): Effect.Effect<Stars, never, Needs> =>
  Option.match(decodeTarget(params), {
    onNone: () => Effect.succeed(missing),
    onSome: effect,
  });

const respond = (
  request: Request,
  effect: (target: Target) => Effect.Effect<Stars, never, Needs>,
  params: unknown,
): Promise<Stars> => provided(request, answered(effect, params));

const written = Effect.fn("stars.write")(function* written(
  request: Request,
  params: unknown,
  change: Change,
) {
  const over = yield* flooded(request);
  if (over) {
    return status(TOO_MANY, "too many requests" as const);
  }
  return yield* answered((target) => changed(request, target, change), params);
});

const respondWrite = (
  request: Request,
  params: unknown,
  change: Change,
): Promise<Stars | TooMany> => provided(request, written(request, params, change));

const respondCounts = (request: Request, params: unknown): Promise<Counts> =>
  provided(
    request,
    Option.match(decodeCategory(params), {
      onNone: () => Effect.succeed<Counts>(missingCounts),
      onSome: ({ category }) => readCounts(category),
    }),
  );

const starRoutes = new Elysia({ prefix: site.starsApiPath, adapter: CloudflareAdapter, aot: false })
  .get("/:category", ({ request, params }) => respondCounts(request, params))
  .get("/:category/:slug", ({ request, params }) =>
    respond(
      request,
      (target) => visitorOf(request).pipe(Effect.flatMap((visitor) => read(target, visitor))),
      params,
    ),
  )
  .put("/:category/:slug", ({ request, params }) => respondWrite(request, params, addStar))
  .delete("/:category/:slug", ({ request, params }) => respondWrite(request, params, removeStar));

export type StarRoutes = typeof starRoutes;

export const handleStars =
  (bindings: StarBindings) =>
  (request: Request): Promise<Response> => {
    bindingsOf.set(request, bindings);
    return starRoutes.handle(request);
  };
