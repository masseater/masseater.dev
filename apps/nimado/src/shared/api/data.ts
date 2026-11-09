import {
  DayViews,
  Meta,
  Shard,
  Table,
  dayPath,
  metaPath,
  shardPath,
  tablePath,
} from "@masseater.dev/nimado";
import type { PlatformName } from "@masseater.dev/nimado";
import { Effect, ManagedRuntime } from "effect";
import type { Schema } from "effect";
import { FetchHttpClient, HttpClient, HttpClientResponse } from "effect/http";

import { BASE_PATH } from "#/shared/config";

interface Query<Value> {
  readonly queryKey: readonly string[];
  readonly queryFn: (context: Readonly<{ signal: AbortSignal }>) => Promise<Value>;
  readonly staleTime: number;
}

type MetaValue = typeof Meta.Type;
type TableValue = typeof Table.Type;
type DayValue = typeof DayViews.Type;
type ShardValue = typeof Shard.Type;

const STALE_TIME = 600_000;

const runtime = ManagedRuntime.make(FetchHttpClient.layer);

const loader =
  <Codec extends Schema.Codec<unknown, unknown>>(codec: Codec) =>
  ({ path, signal }: Readonly<{ path: string; signal: AbortSignal }>): Promise<Codec["Type"]> => {
    const request = HttpClient.get(`${BASE_PATH}/${path}`).pipe(
      Effect.flatMap(HttpClientResponse.filterStatusOk),
      Effect.flatMap(HttpClientResponse.schemaBodyJson(codec)),
      Effect.withSpan("nimado.data", { attributes: { path } }),
    );
    return runtime.runPromise(request, { signal });
  };

const loadMeta = loader(Meta);
const loadTable = loader(Table);
const loadDay = loader(DayViews);
const loadShard = loader(Shard);

const metaQuery: Query<MetaValue> = {
  queryKey: ["nimado", metaPath],
  queryFn: ({ signal }) => loadMeta({ path: metaPath, signal }),
  staleTime: STALE_TIME,
};

const tableQuery: Query<TableValue> = {
  queryKey: ["nimado", tablePath],
  queryFn: ({ signal }) => loadTable({ path: tablePath, signal }),
  staleTime: STALE_TIME,
};

const dayQuery = (day: Readonly<{ platform: PlatformName; date: string }>): Query<DayValue> => {
  const path = dayPath(day);
  return {
    queryKey: ["nimado", path],
    queryFn: ({ signal }) => loadDay({ path, signal }),
    staleTime: STALE_TIME,
  };
};

const shardQuery = (shard: number): Query<ShardValue> => {
  const path = shardPath(shard);
  return {
    queryKey: ["nimado", path],
    queryFn: ({ signal }) => loadShard({ path, signal }),
    staleTime: STALE_TIME,
  };
};

export type { DayValue, MetaValue, Query, ShardValue, TableValue };
export { dayQuery, metaQuery, shardQuery, tableQuery };
