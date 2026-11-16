import type { CredentialState } from "@masseater.dev/portal-protocol";
import type { QueryClient } from "@tanstack/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

import { credentialsQueries } from "#/entities/credential/index.ts";

export const loadCredentialsPage = (queryClient: QueryClient): Promise<unknown> =>
  queryClient.query(credentialsQueries.get.queryOptions());

export const useCredentials = (): readonly CredentialState[] =>
  useSuspenseQuery(credentialsQueries.get.queryOptions()).data;
