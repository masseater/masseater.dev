import type { CloudflareOpContext } from "@distilled.cloud/cloudflare";
import {
  createSuperSlurperJob,
  deleteObjects,
  getSuperSlurperJob,
  listBucketObjects,
} from "@distilled.cloud/cloudflare/r2";
import type { BucketsObjectsListResultItem } from "@distilled.cloud/cloudflare/r2";
import {
  Array as Arr,
  Duration,
  Effect,
  Match,
  Option,
  Predicate,
  Schedule,
  Stream,
  pipe,
} from "effect";

const PAGE_SIZE = 1000;
const POLL_INTERVAL_SECONDS = 5;
const SLURP_TIMEOUT_MINUTES = 30;
const MISSING_SAMPLE = 5;
const POLL = Schedule.spaced(Duration.seconds(POLL_INTERVAL_SECONDS));
const KEY_PROPAGATION_SECONDS = 10;
const KEY_PROPAGATION_RETRIES = 18;
const KEY_PROPAGATION = Schedule.spaced(Duration.seconds(KEY_PROPAGATION_SECONDS));

export type BucketRoute = Readonly<{ accountId: string; source: string; target: string }>;

export type SlurperCredentials = Readonly<{ accessKeyId: string; secretAccessKey: string }>;

type ObjectEntry = Readonly<{ key: string; size: number }>;

const entriesOfItem = (item: BucketsObjectsListResultItem): readonly ObjectEntry[] =>
  Option.all({ key: Option.fromNullishOr(item.key), size: Option.fromNullishOr(item.size) }).pipe(
    Option.toArray,
  );

const entriesOf = Effect.fn("entriesOf")(function* entriesOf(
  accountId: string,
  bucketName: string,
): Effect.fn.Return<readonly ObjectEntry[], never, CloudflareOpContext> {
  const items = yield* pipe(
    listBucketObjects.items({ accountId, bucketName, perPage: PAGE_SIZE }),
    Stream.runCollect,
    Effect.orDie,
  );
  return pipe(items, Arr.flatMap(entriesOfItem));
});

const missingFrom = Effect.fn("missingFrom")(function* missingFrom(
  route: BucketRoute,
): Effect.fn.Return<readonly ObjectEntry[], never, CloudflareOpContext> {
  const [source, target] = yield* Effect.all(
    [entriesOf(route.accountId, route.source), entriesOf(route.accountId, route.target)],
    { concurrency: 2 },
  );
  const sizes = new Map(
    pipe(
      target,
      Arr.map(({ key, size }) => [key, size] as const),
    ),
  );
  return pipe(
    source,
    Arr.filter(({ key, size }) => sizes.get(key) !== size),
  );
});

const waitForJob = Effect.fn("waitForJob")(function* waitForJob(
  accountId: string,
  jobId: string,
): Effect.fn.Return<void, never, CloudflareOpContext> {
  const status = yield* getSuperSlurperJob({ accountId, jobId }).pipe(
    Effect.orDie,
    Effect.map((job) => job.status),
    Effect.repeat({
      schedule: POLL,
      until: (current) => current !== "running",
    }),
  );
  yield* Match.value(status).pipe(
    Match.when("completed", () => Effect.void),
    Match.orElse((other) => Effect.die(`Slurper job ${jobId} ended as ${String(other)}`)),
  );
});

const verify = Effect.fn("verifyObjects")(function* verify(
  route: BucketRoute,
): Effect.fn.Return<void, never, CloudflareOpContext> {
  const missing = yield* missingFrom(route);
  yield* Arr.match(missing, {
    onEmpty: () => Effect.void,
    onNonEmpty: (items) =>
      Effect.die(
        `${items.length} objects of ${route.source} are missing in ${route.target}: ${pipe(
          items,
          Arr.take(MISSING_SAMPLE),
          Arr.map(({ key }) => key),
          Arr.join(", "),
        )}`,
      ),
  });
});

const runJob = Effect.fn("runSlurperJob")(function* runJob(
  route: BucketRoute,
  credentials: SlurperCredentials,
): Effect.fn.Return<void, never, CloudflareOpContext> {
  const { id } = yield* createSuperSlurperJob({
    accountId: route.accountId,
    overwrite: false,
    source: { vendor: "r2", bucket: route.source, secret: credentials },
    target: { vendor: "r2", bucket: route.target, secret: credentials },
  }).pipe(
    Effect.retry({
      schedule: KEY_PROPAGATION,
      times: KEY_PROPAGATION_RETRIES,
      while: Predicate.isTagged("SuperSlurperPreconnectivityFailed"),
    }),
    Effect.orDie,
  );
  yield* Option.match(Option.fromNullishOr(id), {
    onNone: () => Effect.die("Slurper created no job"),
    onSome: (jobId) =>
      waitForJob(route.accountId, jobId).pipe(
        Effect.timeout(Duration.minutes(SLURP_TIMEOUT_MINUTES)),
        Effect.orDie,
      ),
  });
});

/** @internal */
export const slurpObjects = Effect.fn("slurpObjects")(function* slurpObjects(
  route: BucketRoute,
  credentials: SlurperCredentials,
): Effect.fn.Return<void, never, CloudflareOpContext> {
  const missing = yield* missingFrom(route);
  yield* Arr.match(missing, {
    onEmpty: () => Effect.void,
    onNonEmpty: () => runJob(route, credentials),
  });
  yield* verify(route);
});

/** @internal */
export const emptyAfterVerifying = Effect.fn("emptyAfterVerifying")(function* emptyAfterVerifying(
  route: BucketRoute,
): Effect.fn.Return<void, never, CloudflareOpContext> {
  yield* verify(route);
  const entries = yield* entriesOf(route.accountId, route.source);
  yield* Effect.forEach(
    pipe(
      entries,
      Arr.map(({ key }) => key),
      Arr.chunksOf(PAGE_SIZE),
    ),
    (keys) =>
      deleteObjects({ accountId: route.accountId, bucketName: route.source, body: [...keys] }).pipe(
        Effect.orDie,
      ),
    { discard: true, concurrency: 1 },
  );
});
