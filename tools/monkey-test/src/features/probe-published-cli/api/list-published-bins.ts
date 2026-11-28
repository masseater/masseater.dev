import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { ManifestSchema, publishedBinOf } from "#/features/probe-published-cli/model/bins.ts";
import type { PublishedBin } from "#/features/probe-published-cli/model/bins.ts";

const REGISTRY = "https://registry.npmjs.org";
const MAINTAINER = "r_masseater";
const SEARCH_SIZE = "250";
const CONCURRENCY = 8;

const PackageSchema = Schema.Struct({ name: Schema.String });

const SearchSchema = Schema.Struct({
  objects: Schema.Array(Schema.Struct({ package: PackageSchema })),
});

const searchedNames = Effect.fn("monkey.cli.search")(function* searchedNames() {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const request = pipe(
    HttpClientRequest.get(`${REGISTRY}/-/v1/search`),
    HttpClientRequest.setUrlParams({ text: `maintainer:${MAINTAINER}`, size: SEARCH_SIZE }),
  );
  const response = yield* client.execute(request);
  const found = yield* HttpClientResponse.schemaBodyJson(SearchSchema)(response);
  return pipe(
    found.objects,
    Arr.map(({ package: { name } }) => name),
  );
});

const latestOf = Effect.fn("monkey.cli.latest")(function* latestOf(name: string) {
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const response = yield* client.execute(
    HttpClientRequest.get(`${REGISTRY}/${encodeURIComponent(name)}/latest`),
  );
  const manifest = yield* HttpClientResponse.schemaBodyJson(ManifestSchema)(response);
  return publishedBinOf(manifest);
});

const publishedBinsOf = Effect.fn("monkey.cli.publishedBins")(function* publishedBinsOf() {
  const names = yield* searchedNames();
  const manifests = yield* Effect.forEach(names, latestOf, { concurrency: CONCURRENCY });
  return pipe(manifests, Arr.flatMap(Option.toArray)) satisfies readonly PublishedBin[];
});

/** @internal */
export const listPublishedBins = publishedBinsOf;
