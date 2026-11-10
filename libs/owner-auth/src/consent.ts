import { run } from "@r_masseater/workers-tracing/effect";
import { queryOptions } from "@tanstack/react-query";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import { authClient } from "./client";

interface ConsentView {
  readonly name: string;
  readonly details: readonly Readonly<{ label: string; values: readonly string[] }>[];
  readonly allow: "enabled" | "disabled";
}

const CLIENT_ID_LABEL = "クライアント ID";

const REDIRECT_LABEL = "リダイレクト先";

const SCOPES_LABEL = "スコープ";

const HOST_ONLY_PROTOCOL = "https:";

const SCOPE_SEPARATOR = " ";

const ConsentSearch = Schema.Struct({
  client_id: Schema.optional(Schema.String),
  redirect_uri: Schema.optional(Schema.String),
  scope: Schema.optional(Schema.String),
});

type ConsentSearchParams = typeof ConsentSearch.Type;

const validateConsentSearch = Schema.toStandardSchemaV1(ConsentSearch);

const parseUrl = Option.liftThrowable((uri: string) => new URL(uri));

const redirectTargetOf = (redirectUri: string): string =>
  parseUrl(redirectUri).pipe(
    Option.filter(({ protocol, host }) => protocol === HOST_ONLY_PROTOCOL && Str.isNonEmpty(host)),
    Option.map(({ host }) => host),
    Option.getOrElse(() => redirectUri),
  );

const scopesOf = (requestedScope: string): readonly string[] =>
  pipe(requestedScope, Str.split(SCOPE_SEPARATOR), Arr.filter(Str.isNonEmpty), Arr.dedupe);

const consentView = ({
  clientId,
  clientName,
  redirectUri,
  requestedScope,
}: Readonly<{
  clientId: string;
  clientName: Option.Option<string>;
  redirectUri: Option.Option<string>;
  requestedScope: Option.Option<string>;
}>): ConsentView => ({
  name: Option.getOrElse(clientName, () => clientId),
  details: Arr.filter(
    [
      { label: CLIENT_ID_LABEL, values: [clientId] },
      {
        label: REDIRECT_LABEL,
        values: redirectUri.pipe(Option.map(redirectTargetOf), Option.toArray),
      },
      {
        label: SCOPES_LABEL,
        values: requestedScope.pipe(Option.toArray, Arr.flatMap(scopesOf)),
      },
    ],
    ({ values }) => Arr.isReadonlyArrayNonEmpty(values),
  ),
  allow: Option.match(Option.all([clientName, redirectUri]), {
    onNone: () => "disabled",
    onSome: () => "enabled",
  }),
});

const fetchClientName = (clientId: string): Promise<string> =>
  run(
    Effect.promise(() =>
      authClient.oauth2.publicClient({
        query: { client_id: clientId },
        fetchOptions: { throw: true },
      }),
    ).pipe(
      Effect.map(({ client_name }) =>
        Option.getOrElse(Option.fromNullishOr(client_name), () => clientId),
      ),
    ),
  );

const clientNameQuery = (
  clientId: string,
): ReturnType<typeof queryOptions<string, Error, string, readonly ["oauth-client", string]>> =>
  queryOptions({
    queryKey: ["oauth-client", clientId] as const,
    queryFn: () => fetchClientName(clientId),
  });

const answerConsent = (accept: boolean): Promise<unknown> =>
  authClient.oauth2.consent({ accept, fetchOptions: { throw: true } });

export { answerConsent, clientNameQuery, consentView, validateConsentSearch };
export type { ConsentSearchParams, ConsentView };
