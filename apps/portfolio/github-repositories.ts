import { listRepoWorkflows } from "@distilled.cloud/github/actions";
import { listReposAccessibleToInstallation } from "@distilled.cloud/github/apps";
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import type { GithubOpContext } from "@distilled.cloud/github/Protocol";
import { Array as Arr, Effect, Layer, ManagedRuntime, Option, pipe } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

const OWNER = "masseater";
const PAGE_SIZE = 100;
const FIRST_PAGE = 1;
const UP_TO_DATE_WORKFLOW = ".github/workflows/up-to-date.yml";

type ManagedRepository = Readonly<{
  id: number;
  name: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  owner: Readonly<{ login: string }> | null;
}>;

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

const hasUpToDateWorkflow = (repository: ManagedRepository): Effect.Effect<boolean> =>
  Effect.promise(() =>
    gitHubApi.runPromise(
      listRepoWorkflows({ owner: OWNER, repo: repository.name, per_page: PAGE_SIZE }).pipe(
        Effect.orDie,
      ),
    ),
  ).pipe(
    Effect.map(({ workflows }) =>
      pipe(
        workflows,
        Arr.some(({ path }) => path === UP_TO_DATE_WORKFLOW),
      ),
    ),
  );

export { OWNER, hasUpToDateWorkflow, repositories };
export type { ManagedRepository };
