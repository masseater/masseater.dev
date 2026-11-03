import { succeed } from "alchemy/Provider";
import type { Provider } from "alchemy/Provider";
import { Resource } from "alchemy/Resource";
import { Effect } from "effect";

import { OWNER, updateRepository } from "./github-repositories.ts";
import type { ManagedRepository, RepositorySettingsProps } from "./github-repositories.ts";

type RepositorySettingsResource = Resource<
  "MasseaterDev.GitHub.RepositorySettings",
  RepositorySettingsProps,
  RepositorySettingsProps
>;

const RepositorySettings = Resource<RepositorySettingsResource>(
  "MasseaterDev.GitHub.RepositorySettings",
  { defaultRemovalPolicy: "retain" },
);

const settingsProvider = succeed(RepositorySettings, {
  reconcile: Effect.fn(function* reconcile({ news }) {
    yield* updateRepository(news);
    return news;
  }),
  delete: () => Effect.void,
});

const settingsOf = (
  repository: ManagedRepository,
): Effect.Effect<unknown, never, Provider<RepositorySettingsResource>> =>
  RepositorySettings(`RepositorySettings${repository.id}`, {
    owner: OWNER,
    name: repository.name,
    allowUpdateBranch: true,
    secretScanning: !repository.private,
    actionsCreatePullRequests: true,
  });

export { settingsOf, settingsProvider };
export type { RepositorySettingsResource };
