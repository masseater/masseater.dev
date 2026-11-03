import {
  listRepoWorkflows,
  setGithubActionsDefaultWorkflowPermissionsRepository,
} from "@distilled.cloud/github/actions";
import { listReposAccessibleToInstallation } from "@distilled.cloud/github/apps";
import { CredentialsFromEnv } from "@distilled.cloud/github/Credentials";
import type { GithubOpContext } from "@distilled.cloud/github/Protocol";
import { update } from "@distilled.cloud/github/repos";
import type { UpdateRequest } from "@distilled.cloud/github/repos";
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

type RepositorySettingsProps = Readonly<{
  owner: string;
  name: string;
  allowUpdateBranch: boolean;
  secretScanning: boolean;
  actionsCreatePullRequests: boolean;
}>;

const ENABLED = { status: "enabled" } as const;

const securityOf = (secretScanning: boolean): Pick<UpdateRequest, "security_and_analysis"> => {
  if (!secretScanning) {
    return {};
  }
  return {
    security_and_analysis: {
      secret_scanning: ENABLED,
      secret_scanning_push_protection: ENABLED,
    },
  };
};

const applySettings = (
  settings: RepositorySettingsProps,
): Effect.Effect<void, never, GithubOpContext> =>
  Effect.andThen(
    update({
      owner: settings.owner,
      repo: settings.name,
      allow_update_branch: settings.allowUpdateBranch,
      ...securityOf(settings.secretScanning),
    }),
    setGithubActionsDefaultWorkflowPermissionsRepository({
      owner: settings.owner,
      repo: settings.name,
      can_approve_pull_request_reviews: settings.actionsCreatePullRequests,
    }),
  ).pipe(Effect.orDie, Effect.asVoid);

const updateRepository = (settings: RepositorySettingsProps): Effect.Effect<void> =>
  Effect.promise(() => gitHubApi.runPromise(applySettings(settings)));

export { OWNER, hasUpToDateWorkflow, repositories, updateRepository };
export type { ManagedRepository, RepositorySettingsProps };
