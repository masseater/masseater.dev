import type { BoothItem } from "@masseater.dev/aredoko-protocol";
import { Array, Effect, Schema, pipe } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";

import { capture } from "#shared/text";

const ItemJson = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  price: Schema.String,
  url: Schema.String,
  shop: Schema.Struct({ name: Schema.String }),
  tags: Schema.Array(Schema.Struct({ name: Schema.String })),
});

const taggedError = Schema.TaggedError;

class InvalidBoothUrl extends taggedError<InvalidBoothUrl, { readonly brand: unique symbol }>()(
  "InvalidBoothUrl",
  { url: Schema.String },
) {}

const itemUrl = (id: number | string): string => `https://booth.pm/ja/items/${id.toString()}`;

const itemIdOf = capture({ pattern: /booth\.pm\/(?:[a-z-]+\/)?items\/(?<id>\d+)/u, name: "id" });

/** @internal */
const fetchItem = Effect.fn("fetchItem")(function* fetchBoothItem(url: string) {
  const id = yield* pipe(
    itemIdOf(url),
    Effect.fromOption,
    Effect.mapError(() => InvalidBoothUrl.make({ url })),
  );
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(`${itemUrl(id)}.json`);
  const item = yield* HttpClientResponse.schemaBodyJson(ItemJson)(response);
  return {
    id: item.id,
    url: item.url,
    name: item.name,
    shop: item.shop.name,
    price: item.price,
    tags: pipe(
      item.tags,
      Array.map(({ name }) => name),
    ),
  } satisfies typeof BoothItem.Type;
});

export { fetchItem, itemUrl };
