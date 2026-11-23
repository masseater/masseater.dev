import { run } from "@r_masseater/workers-tracing/effect";
import { Elysia } from "@r_masseater/workers-tracing/elysia";
import { env } from "cloudflare:workers";
import { Effect, Option, Schema } from "effect";
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { categories } from "#/entities/entry/index.ts";
import { site } from "#/shared/config/index.ts";

import { addStar, read, readCounts, removeStar } from "./stars-store.server.ts";
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
  const url = new URL(`/${target.category}/${target.slug}`, request.url);
  const response = yield* Effect.promise(() => env.ASSETS.fetch(url, { method: "HEAD" }));
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

const answered = (
  effect: (target: Target) => Effect.Effect<Stars>,
  params: unknown,
): Effect.Effect<Stars> =>
  Option.match(decodeTarget(params), {
    onNone: () => Effect.succeed(missing),
    onSome: effect,
  });

const respond = (
  effect: (target: Target) => Effect.Effect<Stars>,
  params: unknown,
): Promise<Stars> => run(answered(effect, params));

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
): Promise<Stars | TooMany> => run(written(request, params, change));

const missingCounts: Counts = { status: "missing" };

const respondCounts = (params: unknown): Promise<Counts> =>
  run(
    Option.match(decodeCategory(params), {
      onNone: () => Effect.succeed<Counts>(missingCounts),
      onSome: ({ category }) => readCounts(category),
    }),
  );

const starRoutes = new Elysia({ prefix: site.starsApiPath, adapter: CloudflareAdapter, aot: false })
  .get("/:category", ({ params }) => respondCounts(params))
  .get("/:category/:slug", ({ request, params }) =>
    respond(
      (target) => visitorOf(request).pipe(Effect.flatMap((visitor) => read(target, visitor))),
      params,
    ),
  )
  .put("/:category/:slug", ({ request, params }) => respondWrite(request, params, addStar))
  .delete("/:category/:slug", ({ request, params }) => respondWrite(request, params, removeStar));

export const handleStars = starRoutes.handle;

export type StarRoutes = typeof starRoutes;
