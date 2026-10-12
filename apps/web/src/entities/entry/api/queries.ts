import { queryOptions } from "@tanstack/react-query";
import type { QueryKeyWithDataTag, UnusedSkipTokenOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { Effect, Schema } from "effect";

import type { CollectionResult, Entry, EntryResult } from "#/entities/entry/model/entry";

import { allEntries, collectionOf, entryOf } from "./entries.server";

const fetchAllEntries = createServerFn({ method: "GET" }).handler(() =>
  Effect.runPromise(allEntries),
);

const fetchCollection = createServerFn({ method: "GET" })
  .validator(Schema.toStandardSchemaV1(Schema.String))
  .handler(({ data }) => Effect.runPromise(collectionOf(data)));

const fetchEntry = createServerFn({ method: "GET" })
  .validator(
    Schema.toStandardSchemaV1(Schema.Struct({ category: Schema.String, slug: Schema.String })),
  )
  .handler(({ data }) => Effect.runPromise(entryOf(data)));

type EntryQuery<Data, Key extends readonly string[]> = UnusedSkipTokenOptions<
  Data,
  Error,
  Data,
  Key
> &
  QueryKeyWithDataTag<Key, Data>;

const entryQueries = {
  all: (): EntryQuery<readonly Entry[], readonly ["entries"]> =>
    queryOptions({
      queryKey: ["entries"] as const,
      queryFn: () => fetchAllEntries(),
      staleTime: "static",
    }),
  collection: (category: string): EntryQuery<CollectionResult, readonly ["entries", string]> =>
    queryOptions({
      queryKey: ["entries", category] as const,
      queryFn: () => fetchCollection({ data: category }),
      staleTime: "static",
    }),
  detail: (
    category: string,
    slug: string,
  ): EntryQuery<EntryResult, readonly ["entries", string, string]> =>
    queryOptions({
      queryKey: ["entries", category, slug] as const,
      queryFn: () => fetchEntry({ data: { category, slug } }),
      staleTime: "static",
    }),
};

export { entryQueries };
