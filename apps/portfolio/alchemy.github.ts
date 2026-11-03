import { providers as cloudflareProviders, state } from "@alchemy.run/cloudflare";
import { Repository, providers as gitHubProviders } from "@alchemy.run/github";
import type { RepositoryProps } from "@alchemy.run/github";
import { listReposAccessibleToInstallation } from "@distilled.cloud/github/apps";
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import type { GithubOpContext } from "@distilled.cloud/github/Protocol";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Array as Arr, Effect, Layer, ManagedRuntime, Option, pipe } from "effect";
import type { ConfigError } from "effect/Config";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { PREFIX } from "./app-name.ts";

const OWNER = "masseater";
const PAGE_SIZE = 100;
const FIRST_PAGE = 1;

type ManagedRepository = Readonly<{
  id: number;
  name: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  owner: Readonly<{ login: string }> | null;
}>;

const MERGE_POLICY = {
  allowSquashMerge: true,
  allowMergeCommit: false,
  allowRebaseMerge: false,
  deleteBranchOnMerge: true,
} as const satisfies Partial<RepositoryProps>;

const PUBLIC_POLICY = {
  ...MERGE_POLICY,
  allowAutoMerge: true,
} as const satisfies Partial<RepositoryProps>;

const isManaged = (repository: ManagedRepository): boolean =>
  Option.exists(Option.fromNullishOr(repository.owner), ({ login }) => login === OWNER) &&
  !repository.archived &&
  !repository.fork;

const listFrom = (
  number: number,
): Effect.Effect<readonly ManagedRepository[], never, GithubOpContext> =>
  listReposAccessibleToInstallation({ per_page: PAGE_SIZE, page: number }).pipe(
    Effect.orDie,
    Effect.flatMap(({ repositories: listed }) => {
      if (listed.length < PAGE_SIZE) {
        return Effect.succeed(listed);
      }
      return listFrom(number + FIRST_PAGE).pipe(Effect.map((rest) => [...listed, ...rest]));
    }),
  );

const gitHubApi = ManagedRuntime.make(Layer.mergeAll(CredentialsFromEnv, fetchHttpClient));

const repositories: Effect.Effect<readonly ManagedRepository[]> = Effect.promise(() =>
  gitHubApi.runPromise(listFrom(FIRST_PAGE)),
).pipe(Effect.map(Arr.filter(isManaged)));

const policyOf = (repository: ManagedRepository): Partial<RepositoryProps> => {
  if (repository.private) {
    return MERGE_POLICY;
  }
  return PUBLIC_POLICY;
};

const github: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  `${PREFIX}github`,
  {
    providers: Layer.mergeAll(cloudflareProviders(), gitHubProviders()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const managed = yield* repositories;
    yield* pipe(
      managed,
      Effect.forEach((repository) =>
        Repository(`Repository${repository.id}`, {
          owner: OWNER,
          name: repository.name,
          ...policyOf(repository),
        }),
      ),
    );
    return { repositories: managed.length };
  }),
);

export default github;
