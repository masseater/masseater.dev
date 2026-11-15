import type { CredentialState } from "@masseater.dev/portal-protocol";
import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { credentialsQueries } from "#/entities/credentials";

const loadCredentialsPage = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(credentialsQueries.get.queryOptions());

const useCredentials = (): readonly CredentialState[] =>
  useSuspenseQuery(credentialsQueries.get.queryOptions()).data;

export { loadCredentialsPage, useCredentials };
