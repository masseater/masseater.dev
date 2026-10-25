import { env } from "cloudflare:workers";
import { and, count, eq } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Effect, Logger, ManagedRuntime, Option, Record, Schema, pipe } from "effect";
import { Hex } from "effect/encoding";
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { categories, categoryMeta } from "#/entities/entry";
import type { Entry } from "#/entities/entry";
import { star } from "#/features/star/model/star.table";
import { site } from "#/shared/config";

type Target = Readonly<Pick<Entry, "category" | "slug">>;

type Stars =
  | Readonly<{ status: "found"; count: number; starred: boolean }>
  | Readonly<{ status: "missing" }>;

type Counts =
  | Readonly<{ status: "found"; counts: Record.ReadonlyRecord<string, number> }>
  | Readonly<{ status: "missing" }>;

type Change = (target: Target, visitor: string) => Effect.Effect<void>;

const db = drizzle(env.STARS);

const runtime = ManagedRuntime.make(
  Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]),
);

const starrable = pipe(
  categories,
  Arr.filter((category) => categoryMeta[category].reactions),
);

const Slug = Schema.String.check(Schema.isPattern(/^[\w-]+$/u));

const TargetSchema = Schema.Struct({ category: Schema.Literals(starrable), slug: Slug });

const decodeTarget = Schema.decodeUnknownOption(TargetSchema);

const decodeCategory = Schema.decodeUnknownOption(
  Schema.Struct({ category: Schema.Literals(starrable) }),
);

const missing: Stars = { status: "missing" };

const visitorOf = Effect.fn("stars.visitor")(function* visitorOf(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const salted = new TextEncoder().encode(`${env.VISITOR_SALT}:${ip}`);
  const digest = yield* Effect.promise(() => crypto.subtle.digest("SHA-256", salted));
  return Hex.encode(new Uint8Array(digest));
});

const ofTarget = (target: Target): SQL | undefined =>
  and(eq(star.category, target.category), eq(star.slug, target.slug));

const read = Effect.fn("stars.read")(function* read(target: Target, visitor: string) {
  const rows = yield* Effect.promise(() =>
    db.select({ visitor: star.visitor }).from(star).where(ofTarget(target)),
  );
  return {
    status: "found",
    count: rows.length,
    starred: pipe(
      rows,
      Arr.some((row) => row.visitor === visitor),
    ),
  } satisfies Stars;
});

const readCounts = Effect.fn("stars.counts")(function* readCounts(category: Target["category"]) {
  const rows = yield* Effect.promise(() =>
    db
      .select({ slug: star.slug, count: count() })
      .from(star)
      .where(eq(star.category, category))
      .groupBy(star.slug),
  );
  return {
    status: "found",
    counts: Record.fromEntries(
      pipe(
        rows,
        Arr.map((row) => [row.slug, row.count] as const),
      ),
    ),
  } satisfies Counts;
});

const exists = Effect.fn("stars.exists")(function* exists(request: Request, target: Target) {
  const url = new URL(`/${target.category}/${target.slug}`, request.url);
  const response = yield* Effect.promise(() => env.ASSETS.fetch(url, { method: "HEAD" }));
  return response.ok;
});

const addStar: Change = Effect.fn("stars.add")(function* addStar(target, visitor) {
  yield* Effect.promise(() =>
    db
      .insert(star)
      .values({ ...target, visitor })
      .onConflictDoNothing(),
  );
});

const removeStar: Change = Effect.fn("stars.remove")(function* removeStar(target, visitor) {
  yield* Effect.promise(() =>
    db.delete(star).where(and(ofTarget(target), eq(star.visitor, visitor))),
  );
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
    }),
  );

const missingCounts: Counts = { status: "missing" };

const respondCounts = (params: unknown): Promise<Counts> =>
  runtime.runPromise(
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
  .put("/:category/:slug", ({ request, params }) =>
    respond((target) => changed(request, target, addStar), params),
  )
  .delete("/:category/:slug", ({ request, params }) =>
    respond((target) => changed(request, target, removeStar), params),
  );

type StarRoutes = typeof starRoutes;

export type { StarRoutes };
export { starRoutes };
