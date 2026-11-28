import { Array as Arr, Config, Effect, Option, Schema, pipe } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { isPublicPage } from "#/features/find-public-hosts/model/page-host.ts";
import { keepAnsweringHosts } from "#/shared/lib/keep-answering-hosts.ts";

const API = "https://api.cloudflare.com/client/v4/accounts";

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
  return yield* keepAnsweringHosts({ hostnames, probe: probed });
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
