import { Array as Arr, Config, Effect, Option, Order, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { isPublicPage } from "#/features/find-public-hosts/model/page-host.ts";

const API = "https://api.cloudflare.com/client/v4/accounts";
const CONCURRENCY = 8;

const Domains = Schema.Struct({
  result: Schema.Array(Schema.Struct({ hostname: Schema.String })),
});

const customDomains = Effect.fn("monkey.hosts.domains")(function* customDomains() {
  const account = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const token = yield* Config.Redacted("CLOUDFLARE_API_TOKEN");
  const client = (yield* HttpClient.HttpClient).pipe(HttpClient.filterStatusOk);
  const request = pipe(
    HttpClientRequest.get(`${API}/${account}/workers/domains`),
    HttpClientRequest.bearerToken(token),
  );
  const response = yield* client.execute(request);
  const listed = yield* HttpClientResponse.schemaBodyJson(Domains)(response);
  return pipe(
    listed.result,
    Arr.map(({ hostname }) => hostname),
  );
});

const probed = Effect.fn("monkey.hosts.probe")(function* probed(hostname: string) {
  const client = yield* HttpClient.HttpClient;
  const response = yield* client.get(`https://${hostname}/`).pipe(Effect.option);
  return pipe(
    response,
    Option.filter((root) =>
      isPublicPage({
        status: root.status,
        contentType: root.headers["content-type"] ?? "",
        finalHost: new URL(root.request.url).host,
      }),
    ),
    Option.map(() => hostname),
  );
});

const listedPublic = Effect.fn("monkey.hosts.listed")(function* listedPublic() {
  const hostnames = yield* customDomains();
  const probes = yield* Effect.forEach(hostnames, probed, { concurrency: CONCURRENCY });
  return pipe(
    probes,
    Arr.flatMap((probe) => Option.toArray(probe)),
    Arr.sortWith((name) => name, Order.String),
  );
});

const findPublic = Effect.fn("monkey.hosts")(function* findPublic(given: readonly string[]) {
  return yield* Arr.match(given, {
    onEmpty: () => listedPublic(),
    onNonEmpty: (hosts) => Effect.succeed(hosts),
  });
});

const findDomains = Effect.fn("monkey.domains")(function* findDomains(given: readonly string[]) {
  return yield* Arr.match(given, {
    onEmpty: () => customDomains(),
    onNonEmpty: (hosts) => Effect.succeed(hosts),
  });
});

/** @internal */
export const findPublicHosts = findPublic;

/** @internal */
export const findCustomDomains = findDomains;
