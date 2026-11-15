import {
  ConfigError,
  Credentials,
  createKey,
  deleteKey,
  getPolicyFile,
  setKey,
  setPolicyFile,
  validateAndTestPolicyFile,
} from "@distilled.cloud/tailscale";
import type {
  GetPolicyFileError,
  SetPolicyFileError,
  TailscaleOpContext,
  ValidateAndTestPolicyFileError,
} from "@distilled.cloud/tailscale";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Config, Effect, Layer, Option, Redacted, Schema, pipe } from "effect";
import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import { AGENT_SUBJECT, AGENT_TAG, SSH_PORT, TAILNET_ISSUER } from "./tailnet-names.ts";
import { ensureEntries, removeEntries } from "./tailnet-policy.ts";
import type { PolicyEntries } from "./tailnet-policy.ts";

const TAILNET = "-";
const API_ROOT = "https://api.tailscale.com/api/v2";
const TOKEN_EXCHANGE = `${API_ROOT}/oauth/token-exchange`;
const CI_CLIENT_ID = "TODO-ci-federated-identity";
const CI_AUDIENCE = `api.tailscale.com/${CI_CLIENT_ID}`;

const AGENT_POLICY: PolicyEntries = {
  tagOwners: { [AGENT_TAG]: ["autogroup:admin"] },
  grants: [{ src: [AGENT_TAG], dst: ["autogroup:member"], ip: [`tcp:${String(SSH_PORT)}`] }],
};

type FederatedIdentityProps = Readonly<{
  description: string;
  issuer: string;
  subject: string;
  scopes: readonly string[];
  tags: readonly string[];
}>;

type FederatedIdentityResource = Resource<
  "MasseaterDev.Tailscale.FederatedIdentity",
  FederatedIdentityProps,
  Readonly<{ keyId: string; audience: string }>
>;

type PolicyEntriesResource = Resource<
  "MasseaterDev.Tailscale.PolicyEntries",
  PolicyEntries,
  PolicyEntries
>;

const FederatedIdentity = Resource<FederatedIdentityResource>(
  "MasseaterDev.Tailscale.FederatedIdentity",
);

const TailnetPolicyEntries = Resource<PolicyEntriesResource>(
  "MasseaterDev.Tailscale.PolicyEntries",
);

const IdentityKey = Schema.Struct({ id: Schema.NonEmptyString, audience: Schema.NonEmptyString });

type Identity = Readonly<{ keyId: string; audience: string }>;

const identityOf = (key: unknown): Effect.Effect<Identity> =>
  Schema.decodeUnknownEffect(IdentityKey)(key).pipe(
    Effect.map(({ id, audience }) => ({ keyId: id, audience })),
    Effect.orDie,
  );

const federatedIdentityProvider = succeed(FederatedIdentity, {
  reconcile: ({ news, output }) => {
    const request = {
      tailnet: TAILNET,
      keyType: "federated",
      description: news.description,
      issuer: news.issuer,
      subject: news.subject,
      scopes: [...news.scopes],
      tags: [...news.tags],
    };
    const saved = Option.match(Option.fromNullishOr(output), {
      onNone: () => createKey(request),
      onSome: ({ keyId }) => setKey({ ...request, keyId }),
    });
    return pipe(saved, Effect.flatMap(identityOf));
  },
  delete: ({ output }) =>
    deleteKey({ tailnet: TAILNET, keyId: output.keyId }).pipe(
      Effect.catchTag("NotFound", () => Effect.void),
      Effect.asVoid,
    ),
});

const ifMatch = (eTag: string | undefined): Readonly<{ ifMatch?: string }> =>
  Option.match(Option.fromNullishOr(eTag), {
    onNone: () => ({}),
    onSome: (value) => ({ ifMatch: value }),
  });

const rewritePolicy = (
  edit: (body: string) => string,
): Effect.Effect<
  void,
  GetPolicyFileError | ValidateAndTestPolicyFileError | SetPolicyFileError,
  TailscaleOpContext
> =>
  Effect.gen(function* rewrite() {
    const current = yield* getPolicyFile({ tailnet: TAILNET });
    const body = edit(current.body);
    if (body === current.body) {
      return;
    }
    yield* validateAndTestPolicyFile({ tailnet: TAILNET, body });
    yield* setPolicyFile({ tailnet: TAILNET, body, ...ifMatch(current.eTag) });
  });

const policyEntriesProvider = succeed(TailnetPolicyEntries, {
  reconcile: ({ news }) => rewritePolicy(ensureEntries(news)).pipe(Effect.as(news)),
  delete: ({ output }) => rewritePolicy(removeEntries(output)),
});

const GitHubIdToken = Schema.Struct({ value: Schema.String });

const ExchangedToken = Schema.Struct({ access_token: Schema.String });

const exchangeFailed = (cause: unknown): ConfigError =>
  new ConfigError({ message: `Tailscale token exchange failed: ${String(cause)}` });

const githubIdToken = Effect.gen(function* githubIdToken() {
  const url = yield* Config.String("ACTIONS_ID_TOKEN_REQUEST_URL");
  const token = yield* Config.Redacted("ACTIONS_ID_TOKEN_REQUEST_TOKEN");
  const response = yield* HttpClient.get(`${url}&audience=${encodeURIComponent(CI_AUDIENCE)}`, {
    headers: { authorization: `Bearer ${Redacted.value(token)}` },
  }).pipe(Effect.flatMap(HttpClientResponse.filterStatusOk));
  return (yield* HttpClientResponse.schemaBodyJson(GitHubIdToken)(response)).value;
});

const exchanged = Effect.gen(function* exchange() {
  const jwt = yield* githubIdToken;
  const body = HttpBody.urlParams([
    ["client_id", CI_CLIENT_ID],
    ["jwt", jwt],
  ]);
  const request = pipe(HttpClientRequest.post(TOKEN_EXCHANGE), HttpClientRequest.setBody(body));
  const response = yield* HttpClient.execute(request).pipe(
    Effect.flatMap(HttpClientResponse.filterStatusOk),
  );
  const { access_token } = yield* HttpClientResponse.schemaBodyJson(ExchangedToken)(response);
  return { token: Redacted.make(access_token), apiBaseUrl: API_ROOT };
});

const tailscaleCredentials = Layer.effect(
  Credentials,
  Effect.gen(function* cached() {
    const client = yield* HttpClient.HttpClient;
    return yield* Effect.cached(
      exchanged.pipe(
        Effect.provideService(HttpClient.HttpClient, client),
        Effect.mapError(exchangeFailed),
      ),
    );
  }),
);

/** @internal */
const tailscaleProviders = Layer.mergeAll(federatedIdentityProvider, policyEntriesProvider).pipe(
  Layer.provideMerge(tailscaleCredentials),
  Layer.provideMerge(FetchHttpClient.layer),
);

const agentTrust = Effect.gen(function* trust() {
  yield* TailnetPolicyEntries("TailnetAgentPolicy", AGENT_POLICY);
  return yield* FederatedIdentity("TailnetAgentIdentity", {
    description: "agents via sundries",
    issuer: TAILNET_ISSUER,
    subject: AGENT_SUBJECT,
    scopes: ["auth_keys"],
    tags: [AGENT_TAG],
  });
});

export { agentTrust, tailscaleProviders };
