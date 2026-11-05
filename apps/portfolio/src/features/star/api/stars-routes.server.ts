import { env } from "cloudflare:workers";
import { Effect, Logger, ManagedRuntime, Option, Schema } from "effect";
import { Hex } from "effect/encoding";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { categories } from "#/entities/entry";
import { site } from "#/shared/config";

import { addStar, read, readCounts, removeStar } from "./stars-store.server";
import type { Change, Counts, Stars, Target } from "./stars-store.server";
import { cloudflareLogger, withCloudflareTracing } from "./tracing.server";

const runtime = ManagedRuntime.make(Logger.layer([cloudflareLogger]));

const Slug = Schema.String.check(Schema.isPattern(/^[\w-]+$/u));

const TargetSchema = Schema.Struct({ category: Schema.Literals(categories), slug: Slug });

const decodeTarget = Schema.decodeUnknownOption(TargetSchema);

const decodeCategory = Schema.decodeUnknownOption(
  Schema.Struct({ category: Schema.Literals(categories) }),
);

const missing: Stars = { status: "missing" };

const visitorOf = Effect.fn("stars.visitor")(function* visitorOf(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const salted = new TextEncoder().encode(`${env.VISITOR_SALT}:${ip}`);
  const digest = yield* Effect.promise(() => crypto.subtle.digest("SHA-256", salted));
  return Hex.encode(new Uint8Array(digest));
});

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

const respond = (
  effect: (target: Target) => Effect.Effect<Stars>,
  params: unknown,
): Promise<Stars> =>
  runtime.runPromise(
    Option.match(decodeTarget(params), {
      onNone: () => Effect.succeed(missing),
      onSome: effect,
    }).pipe(withCloudflareTracing),
  );

const missingCounts: Counts = { status: "missing" };

const respondCounts = (params: unknown): Promise<Counts> =>
  runtime.runPromise(
    Option.match(decodeCategory(params), {
      onNone: () => Effect.succeed<Counts>(missingCounts),
      onSome: ({ category }) => readCounts(category),
    }).pipe(withCloudflareTracing),
  );

const starRoutes = new Elysia({ prefix: site.starsApiPath, adapter: CloudflareAdapter, aot: false })
  .get("/:category", ({ params }) => respondCounts(params))
  .get("/:category/:slug", ({ request, params }) =>
    respond(
      (target) => visitorOf(request).pipe(Effect.flatMap((visitor) => read(target, visitor))),
      params,
    ),
  )
  .put("/:category/:slug", ({ request, params }) =>
    respond((target) => changed(request, target, addStar), params),
  )
  .delete("/:category/:slug", ({ request, params }) =>
    respond((target) => changed(request, target, removeStar), params),
  );

type StarRoutes = typeof starRoutes;

export type { StarRoutes };
export { starRoutes };
