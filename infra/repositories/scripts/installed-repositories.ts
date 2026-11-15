import { listReposAccessibleToInstallation } from "@distilled.cloud/github/apps";
import type { GithubOpContext } from "@distilled.cloud/github/Protocol";
import { Array as Arr, Effect, Option, Stream } from "effect";

import { OWNER } from "#github-oidc";

const PAGE_SIZE = 100;

export type InstalledRepository = Readonly<{ name: string; private: boolean; archived: boolean }>;

/** @internal */
export const installedRepositories: Effect.Effect<
  readonly InstalledRepository[],
  never,
  GithubOpContext
> = listReposAccessibleToInstallation
  .items({ per_page: PAGE_SIZE })
  .pipe(
    Stream.runCollect,
    Effect.orDie,
    Effect.map(
      Arr.filter((repository) =>
        Option.exists(Option.fromNullishOr(repository.owner), ({ login }) => login === OWNER),
      ),
    ),
  );
