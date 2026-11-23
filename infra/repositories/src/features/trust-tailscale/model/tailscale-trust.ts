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
  SetPolicyFileError,
  TailscaleOpContext,
  ValidateAndTestPolicyFileError,
} from "@distilled.cloud/tailscale";
import { map as mapOutput } from "alchemy/Output";
import { succeed } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Config, Effect, Layer, Option, Record, Redacted, Schema, pipe } from "effect";
import {
  FetchHttpClient,
  HttpBody,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/http";

import { AGENT_SUBJECT, AGENT_TAG, SSH_PORT, TAILNET_ISSUER } from "#/shared/config/index.ts";

import { ensureEntries, grantFor, removeEntries, replaceEntries } from "./tailnet-policy.ts";
import type { Access, PolicyEntries } from "./tailnet-policy.ts";

const TAILNET = "-";
const API_ROOT = "https://api.tailscale.com/api/v2";
const TOKEN_EXCHANGE = `${API_ROOT}/oauth/token-exchange`;
const CI_CLIENT_ID = "TMwqo2dMr211CNTRL-k9SS94yMES11CNTRL";
const CI_AUDIENCE = `api.tailscale.com/${CI_CLIENT_ID}`;

type AgentPolicy = Readonly<{ tagOwners: PolicyEntries["tagOwners"]; access: Access }>;

const AGENT_POLICY: AgentPolicy = {
  tagOwners: { [AGENT_TAG]: ["autogroup:admin"] },
  access: { src: [AGENT_TAG], ip: [`tcp:${String(SSH_PORT)}`] },
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
  AgentPolicy,
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
      onSome: ({ keyId, audience }) => setKey({ ...request, keyId, audience }),
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

type PolicyFile = Readonly<{ body: string; eTag?: string | undefined }>;

const savePolicy = (
  current: PolicyFile,
  body: string,
): Effect.Effect<void, ValidateAndTestPolicyFileError | SetPolicyFileError, TailscaleOpContext> =>
  Effect.gen(function* save() {
    if (body === current.body) {
      return;
    }
    yield* validateAndTestPolicyFile({ tailnet: TAILNET, body });
    yield* setPolicyFile({ tailnet: TAILNET, body, ...ifMatch(current.eTag) });
  });

const destinationMissing = (): ConfigError =>
  new ConfigError({
    message: `The Tailscale policy file has no grant from ${AGENT_TAG}. Add it with its destination in the admin console.`,
  });

const entriesIn = (
  { tagOwners, access }: AgentPolicy,
  body: string,
): Effect.Effect<PolicyEntries, ConfigError> =>
  pipe(
    grantFor(access)(body),
    Option.match({
      onNone: () => Effect.fail(destinationMissing()),
      onSome: (grant) => Effect.succeed({ tagOwners, grants: [grant] }),
    }),
  );

const policyEntriesProvider = succeed(TailnetPolicyEntries, {
  reconcile: ({ news, output }) =>
    Effect.gen(function* reconcile() {
      const current = yield* getPolicyFile({ tailnet: TAILNET });
      const entries = yield* entriesIn(news, current.body);
      const edit = Option.match(Option.fromNullishOr(output), {
        onNone: () => ensureEntries(entries),
        onSome: (previous) => replaceEntries(previous)(entries),
      });
      yield* savePolicy(current, edit(current.body));
      return entries;
    }),
  delete: ({ output }) =>
    Effect.gen(function* remove() {
      const current = yield* getPolicyFile({ tailnet: TAILNET });
      yield* savePolicy(current, removeEntries(output)(current.body));
    }),
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
export const tailscaleProviders = Layer.mergeAll(
  federatedIdentityProvider,
  policyEntriesProvider,
).pipe(Layer.provideMerge(tailscaleCredentials), Layer.provideMerge(FetchHttpClient.layer));

export const agentTrust = Effect.gen(function* trust() {
  const policy = yield* TailnetPolicyEntries("TailnetAgentPolicy", AGENT_POLICY);
  return yield* FederatedIdentity("TailnetAgentIdentity", {
    description: "agents via sundries",
    issuer: TAILNET_ISSUER,
    subject: AGENT_SUBJECT,
    scopes: ["auth_keys"],
    tags: pipe(
      policy.tagOwners,
      mapOutput((owners) => Record.keys(owners)),
    ),
  });
});
