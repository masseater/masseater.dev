import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, FileSystem, Layer, ManagedRuntime, Option, Path } from "effect";
import type { Redacted } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import type { HttpClientResponse } from "effect/http";

import { GitHubError } from "#/features/audit-workflows/model/github.ts";
import type { GitHubClient, Reachability } from "#/features/audit-workflows/model/github.ts";

import { makeClient } from "./client.ts";
import { endpointsOf } from "./endpoints.ts";
import { REACHABLE_FILE, reachabilityOf } from "./reachability.ts";
import { AGENT } from "./transport.ts";
import type { Exchange, Reply, Transport } from "./transport.ts";

const RETRIES = 3;

const platform = ManagedRuntime.make(Layer.mergeAll(FetchHttpClient.layer, nodeServices));

const failure = (cause: { readonly message: string }): GitHubError =>
  GitHubError.make({ message: cause.message });

const requestOf = (exchange: Exchange): HttpClientRequest.HttpClientRequest => {
  const base = HttpClientRequest.make(exchange.method)(exchange.url).pipe(
    HttpClientRequest.setHeaders({ ...exchange.headers, "User-Agent": AGENT }),
  );
  return Option.match(exchange.body, {
    onNone: () => base,
    onSome: ({ bytes, type }) => HttpClientRequest.bodyUint8Array(base, bytes, type),
  });
};

const replyOf = (
  response: HttpClientResponse.HttpClientResponse,
): Effect.Effect<Reply, GitHubError> =>
  response.arrayBuffer.pipe(
    Effect.mapBoth({
      onSuccess: (buffer) => ({ status: response.status, bytes: new Uint8Array(buffer) }),
      onFailure: failure,
    }),
  );

const transportOf =
  (client: HttpClient.HttpClient): Transport =>
  (exchange) =>
    client.execute(requestOf(exchange)).pipe(
      Effect.mapError(failure),
      Effect.flatMap(replyOf),
      Effect.withSpan("fu4.github.request", {
        attributes: { "http.request.method": exchange.method, "url.full": exchange.url },
      }),
    );

const savedReachability = Effect.fn("fu4.github.reachability")(function* savedReachability(
  root: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.join(root, ...REACHABLE_FILE);
  const append = (line: string): Effect.Effect<void> =>
    fileSystem
      .makeDirectory(path.dirname(file), { recursive: true })
      .pipe(Effect.andThen(fileSystem.writeFileString(file, line, { flag: "a" })), Effect.ignore);
  const saved = yield* fileSystem.readFileString(file).pipe(Effect.orElseSucceed(() => ""));
  const reachability: Reachability = reachabilityOf(append)(saved);
  return reachability;
});

const started = Effect.fn("fu4.github.start")(function* started(
  host: string,
  root: string,
  token: Redacted.Redacted,
) {
  const http = yield* HttpClient.HttpClient;
  const reachability = yield* savedReachability(root);
  const transport = transportOf(
    http.pipe(HttpClient.retryTransient({ retryOn: "errors-and-responses", times: RETRIES })),
  );
  return yield* makeClient({ endpoints: endpointsOf(host), token, transport }, reachability);
});

export interface Start {
  readonly host: string;
  readonly root: string;
  readonly token: Redacted.Redacted;
}

export const startClient = ({ host, root, token }: Start): Effect.Effect<GitHubClient> =>
  platform.contextEffect.pipe(
    Effect.flatMap((context) => Effect.provideContext(started(host, root, token), context)),
  );
