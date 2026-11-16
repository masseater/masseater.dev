import { Array as Arr, Config, Effect, Option, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { searchTermOf } from "#/entities/model-use/index.ts";
import type { CatalogEntry } from "#/entities/model-use/index.ts";

const API = "https://api.cloudflare.com/client/v4/accounts";

const RETIRES = "planned_deprecation_date";

const Property = Schema.Struct({ property_id: Schema.String, value: Schema.Unknown });

const Model = Schema.Struct({ name: Schema.String, properties: Schema.Array(Property) });

const Search = Schema.Struct({ result: Schema.Array(Model) });

type ModelValue = typeof Model.Type;

const isDate = Schema.is(Schema.NonEmptyString);

const retiresOn = (model: ModelValue): Option.Option<string> =>
  pipe(
    Arr.findFirst(model.properties, (property) => property.property_id === RETIRES),
    Option.flatMap((property) => Option.liftPredicate(property.value, isDate)),
  );

const entryOf = (model: ModelValue): CatalogEntry => ({
  name: model.name,
  retiresOn: retiresOn(model),
});

const search = Effect.fn("workersAi.search")(function* search(model: string) {
  const account = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const token = yield* Config.Redacted("CLOUDFLARE_API_TOKEN");
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const request = pipe(
    HttpClientRequest.get(`${API}/${account}/ai/models/search`),
    HttpClientRequest.setUrlParams({ search: searchTermOf(model) }),
    HttpClientRequest.bearerToken(token),
  );
  const response = yield* client.execute(request);
  const found = yield* HttpClientResponse.schemaBodyJson(Search)(response);
  return pipe(found.result, Arr.map(entryOf));
});

const searchAll = (
  models: readonly string[],
): Effect.Effect<
  readonly CatalogEntry[],
  Effect.Error<ReturnType<typeof search>>,
  Effect.Services<ReturnType<typeof search>>
> => pipe(models, Effect.forEach(search), Effect.map(Arr.flatten));

/** @internal */
export const catalogOf = searchAll;
