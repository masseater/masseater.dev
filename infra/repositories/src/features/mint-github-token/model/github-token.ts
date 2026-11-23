import { Credentials, repos } from "@distilled.cloud/github";
import type { GithubOpContext } from "@distilled.cloud/github";
import { createInstallationAccessToken, getUserInstallation } from "@distilled.cloud/github/apps";
import type { Installation } from "@distilled.cloud/github/apps";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { DateTime, Effect, Layer, Logger, Option, pipe } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import {
  MASSEATER_DEV_GITHUB_GRANT,
  gitHubAppCredentials,
  readApp,
  OWNER,
} from "#/entities/credential/index.ts";
import type { GitHubGrant, GitHubAppEnv, GitHubAppFailed } from "#/entities/credential/index.ts";

import { installationCredentials, isSourceRepository } from "./installation-repository.ts";

export type MintInput = Readonly<{ env: GitHubAppEnv; grant: GitHubGrant }>;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const findInstallation: Effect.Effect<
  Option.Option<Installation>,
  never,
  GithubOpContext
> = getUserInstallation({ username: OWNER }).pipe(
  Effect.tapError((failure) => Effect.logWarning("github_app.not_installed", failure)),
  Effect.option,
);

const installationOf = (
  env: GitHubAppEnv,
): Effect.Effect<Option.Option<Installation>, GitHubAppFailed, GithubOpContext> =>
  readApp(env).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.logWarning("github_app.missing").pipe(Effect.as(Option.none())),
        onSome: () => findInstallation,
      }),
    ),
  );

const repositoriesOf = (grant: GitHubGrant): Readonly<{ repositories?: string[] }> =>
  Option.match(Option.fromNullishOr(grant.repositories), {
    onNone: () => ({}),
    onSome: (repositories) => ({ repositories: [...repositories] }),
  });

const mint = ({
  env,
  grant,
}: MintInput): Effect.Effect<Option.Option<string>, GitHubAppFailed, GithubOpContext> =>
  Effect.gen(function* mintToken() {
    const installation = yield* installationOf(env);
    if (Option.isNone(installation)) {
      return Option.none<string>();
    }
    const minted = yield* createInstallationAccessToken({
      installation_id: installation.value.id,
      permissions: { ...grant.permissions },
      ...repositoriesOf(grant),
    }).pipe(
      Effect.tapError((failure) => Effect.logWarning("github_app.token_failed", failure)),
      Effect.option,
    );
    return pipe(
      minted,
      Option.map(({ token }) => token),
    );
  });

const runMint = <Value>(
  env: GitHubAppEnv,
  effect: Effect.Effect<Value, never, GithubOpContext>,
): Promise<Value> =>
  runner(Layer.mergeAll(logger, fetchHttpClient, gitHubAppCredentials(env)))(effect);

const EXPOSURE_REPOSITORY = "masseater.dev";

const DISPATCH_GRANT: GitHubGrant = {
  permissions: { contents: "write", metadata: "read" },
  repositories: [EXPOSURE_REPOSITORY],
};

const dispatchAs = (token: string): Effect.Effect<void, never, GithubOpContext> =>
  Effect.gen(function* dispatchEvent() {
    const now = yield* DateTime.now;
    const credentials = installationCredentials({ token, issuedAt: DateTime.toEpochMillis(now) });
    const request = { owner: OWNER, repo: EXPOSURE_REPOSITORY, event_type: "exposure" };
    yield* repos
      .createDispatchEvent(request)
      .pipe(Effect.provideService(Credentials, credentials), Effect.orDie);
    yield* Effect.logInfo("exposure.dispatched");
  });

const dispatch = (env: GitHubAppEnv): Effect.Effect<void, never, GithubOpContext> =>
  mint({ env, grant: DISPATCH_GRANT }).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.logError("exposure.dispatch_unauthorized"),
        onSome: dispatchAs,
      }),
    ),
    Effect.catchCause((cause) => Effect.logError("exposure.dispatch_failed", cause)),
  );

export const dispatchExposure = (env: GitHubAppEnv): Promise<void> => runMint(env, dispatch(env));

export const mintGitHubToken = (input: MintInput): Promise<Option.Option<string>> =>
  runMint(input.env, mint(input).pipe(Effect.orDie));

export type SourceInput = Readonly<{ env: GitHubAppEnv; repository: string }>;

const isSource = ({
  env,
  repository,
}: SourceInput): Effect.Effect<boolean, GitHubAppFailed, GithubOpContext> =>
  mint({ env, grant: { permissions: { metadata: "read" }, repositories: [repository] } }).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(false),
        onSome: (token) => Effect.promise(() => isSourceRepository({ token, repository })),
      }),
    ),
  );

export const ownsSource = (input: SourceInput): Promise<boolean> =>
  runMint(input.env, isSource(input).pipe(Effect.orDie));

const BAD_GATEWAY = 502;

const sloppediaToken = (env: GitHubAppEnv): Effect.Effect<Response, never, GithubOpContext> =>
  mint({ env, grant: MASSEATER_DEV_GITHUB_GRANT }).pipe(
    Effect.map(
      Option.match({
        onNone: () => new Response("", { status: BAD_GATEWAY }),
        onSome: (token) => new Response(token),
      }),
    ),
    Effect.catchCause((cause) =>
      Effect.logError("github_app.sloppedia_failed", cause).pipe(
        Effect.as(new Response("", { status: BAD_GATEWAY })),
      ),
    ),
  );

export class SloppediaGitHub extends WorkerEntrypoint<GitHubAppEnv> {
  public override fetch(): Promise<Response> {
    return runMint(this.env, sloppediaToken(this.env));
  }
}
