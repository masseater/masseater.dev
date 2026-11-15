import { listRecords } from "@distilled.cloud/cloudflare/dns";
import { listProjects } from "@distilled.cloud/cloudflare/pages";
import {
  listBucketDomainCustoms,
  listBucketDomainManageds,
  listBuckets,
} from "@distilled.cloud/cloudflare/r2";
import {
  getScriptScriptAndVersionSetting,
  getScriptSubdomain,
  getSubdomain,
  listDomains,
  listRoutes,
  listScripts,
} from "@distilled.cloud/cloudflare/workers";
import {
  listAccessAiControlMcpServers,
  listAccessApplicationsForAccount,
} from "@distilled.cloud/cloudflare/zero-trust";
import { listZones } from "@distilled.cloud/cloudflare/zones";
import { Array as Arr, Effect, Option, Record as Rec, Stream, pipe } from "effect";

import { appOf } from "./access-apps.ts";
import type { Bucket, DnsRecord, Inventory, WorkerRoute, WorkerScript } from "./inventory.ts";

const BUCKET_PAGE = 1000;
const CONCURRENCY = 8;

const collect = <Item, Failure, Context>(
  stream: Stream.Stream<Item, Failure, Context>,
): Effect.Effect<readonly Item[], Failure, Context> =>
  Stream.runCollect(stream).pipe(Effect.map((items) => Arr.fromIterable(items)));

type RawBinding = Readonly<{
  type: string;
  databaseId?: string | null;
  namespaceId?: string | null;
  bucketName?: string | null;
  indexName?: string | null;
  id?: string | null;
}>;

const STORAGE_KEYS: Readonly<Record<string, keyof RawBinding>> = {
  d1: "databaseId",
  kv_namespace: "namespaceId",
  durable_object_namespace: "namespaceId",
  r2_bucket: "bucketName",
  vectorize: "indexName",
  hyperdrive: "id",
};

const storageKey = (binding: RawBinding): readonly string[] =>
  pipe(
    Rec.get(STORAGE_KEYS, binding.type),
    Option.flatMap((field) => Option.fromNullishOr(binding[field])),
    Option.map((id) => `${binding.type}:${id}`),
    Option.toArray,
  );

const storageOf = (bindings: readonly RawBinding[]): readonly string[] =>
  pipe(bindings, Arr.flatMap(storageKey), Arr.dedupe);

const scriptOf = Effect.fn("exposure.script")(function* scriptOf(
  ids: Readonly<{ accountId: string; scriptName: string }>,
) {
  const settings = yield* getScriptScriptAndVersionSetting(ids);
  const subdomain = yield* getScriptSubdomain(ids);
  const bindings: readonly RawBinding[] = settings.bindings ?? [];
  return {
    name: ids.scriptName,
    workersDev: subdomain.enabled,
    previews: subdomain.previewsEnabled,
    storage: storageOf(bindings),
  } satisfies WorkerScript;
});

const scriptsOf = Effect.fn("exposure.scripts")(function* scriptsOf(accountId: string) {
  const listed = yield* collect(listScripts.items({ accountId }));
  const names = pipe(
    listed,
    Arr.flatMap((script) => Option.toArray(Option.fromNullishOr(script.id))),
  );
  return yield* Effect.forEach(names, (scriptName) => scriptOf({ accountId, scriptName }), {
    concurrency: CONCURRENCY,
  });
});

const bucketOf = Effect.fn("exposure.bucket")(function* bucketOf(
  ids: Readonly<{ accountId: string; bucketName: string }>,
) {
  const managed = yield* listBucketDomainManageds(ids);
  const custom = yield* listBucketDomainCustoms(ids);
  return {
    name: ids.bucketName,
    devUrl: managed.enabled,
    customDomains: pipe(
      custom.domains,
      Arr.map((domain) => domain.domain),
    ),
  } satisfies Bucket;
});

const bucketsOf = Effect.fn("exposure.buckets")(function* bucketsOf(accountId: string) {
  const { buckets } = yield* listBuckets({ accountId, perPage: BUCKET_PAGE });
  if (buckets.length >= BUCKET_PAGE) {
    return yield* Effect.die(
      new Error(`${String(BUCKET_PAGE)} R2 buckets or more; listing stops at one page`),
    );
  }
  const names = pipe(
    buckets,
    Arr.flatMap((bucket) => Option.toArray(Option.fromNullishOr(bucket.name))),
  );
  return yield* Effect.forEach(names, (bucketName) => bucketOf({ accountId, bucketName }), {
    concurrency: CONCURRENCY,
  });
});

type RawRecord = Readonly<{
  name?: string | null;
  type?: string | null;
  content?: string | null;
  proxied?: boolean | null;
}>;

const recordOf = (record: RawRecord): DnsRecord => ({
  name: record.name ?? "",
  type: record.type ?? "",
  content: record.content ?? "",
  proxied: record.proxied === true,
});

type RawRoute = Readonly<{ pattern: string; script?: string | null }>;

const routeOf = (route: RawRoute): readonly WorkerRoute[] =>
  pipe(
    Option.fromNullishOr(route.script),
    Option.map((script) => ({ pattern: route.pattern, script })),
    Option.toArray,
  );

const routesIn = Effect.fn("exposure.routes")(function* routesIn(zoneId: string) {
  const routes = yield* collect(listRoutes.items({ zoneId }));
  return pipe(routes, Arr.flatMap(routeOf));
});

const recordsIn = Effect.fn("exposure.records")(function* recordsIn(zoneId: string) {
  const records = yield* collect(listRecords.items({ zoneId }));
  return pipe(records, Arr.map(recordOf));
});

const zoneParts = Effect.fn("exposure.zone_parts")(function* zoneParts(zoneIds: readonly string[]) {
  const routes = yield* Effect.forEach(zoneIds, routesIn, { concurrency: CONCURRENCY });
  const records = yield* Effect.forEach(zoneIds, recordsIn, { concurrency: CONCURRENCY });
  return { routes: Arr.flatten(routes), records: Arr.flatten(records) };
});

const workersSubdomainOf = Effect.fn("exposure.workers_subdomain")(function* workersSubdomainOf(
  accountId: string,
) {
  const { subdomain } = yield* getSubdomain({ accountId });
  return subdomain;
});

const appsOf = Effect.fn("exposure.apps")(function* appsOf(accountId: string) {
  const apps = yield* collect(listAccessApplicationsForAccount.items({ accountId }));
  return pipe(apps, Arr.map(appOf));
});

const domainsOf = Effect.fn("exposure.domains")(function* domainsOf(accountId: string) {
  const domains = yield* collect(listDomains.items({ accountId }));
  return pipe(
    domains,
    Arr.map(({ hostname, service }) => ({ hostname, service })),
  );
});

const mcpServersOf = Effect.fn("exposure.mcp_servers")(function* mcpServersOf(accountId: string) {
  const servers = yield* collect(listAccessAiControlMcpServers.items({ accountId }));
  return pipe(
    servers,
    Arr.map(({ name, hostname }) => ({ name, url: hostname })),
  );
});

const pagesOf = Effect.fn("exposure.pages")(function* pagesOf(accountId: string) {
  const projects = yield* collect(listProjects.items({ accountId }));
  return pipe(
    projects,
    Arr.map(({ name, domains }) => ({ name, domains: domains ?? [] })),
  );
});

const accountParts = Effect.fn("exposure.account_parts")(function* accountParts(accountId: string) {
  return yield* Effect.all(
    {
      workersSubdomain: workersSubdomainOf(accountId),
      apps: appsOf(accountId),
      scripts: scriptsOf(accountId),
      domains: domainsOf(accountId),
      buckets: bucketsOf(accountId),
      mcpServers: mcpServersOf(accountId),
      pages: pagesOf(accountId),
    },
    { concurrency: "unbounded" },
  );
});

const inventoryOf = Effect.fn("exposure.cloudflare")(function* inventoryOf(accountId: string) {
  const zones = yield* collect(listZones.items({ account: { id: accountId } }));
  const zoneIds = pipe(
    zones,
    Arr.map((zone) => zone.id),
  );
  const account = yield* accountParts(accountId);
  const perZoneParts = yield* zoneParts(zoneIds);
  return {
    zones: pipe(
      zones,
      Arr.map((zone) => zone.name),
    ),
    ...account,
    ...perZoneParts,
  } satisfies Omit<Inventory, "repositories">;
});

/** @internal */
const cloudflareInventory = inventoryOf;

export { cloudflareInventory };
