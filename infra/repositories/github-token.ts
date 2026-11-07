import type { GithubOpContext } from "@distilled.cloud/github";
import { createInstallationAccessToken, getUserInstallation } from "@distilled.cloud/github/apps";
import type { Installation } from "@distilled.cloud/github/apps";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Layer, Logger, Option, pipe } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { SLOPPEDIA_GITHUB_GRANT } from "./credential-grants.ts";
import type { GitHubGrant } from "./credential-grants.ts";
import { gitHubAppCredentials, readApp } from "./github-app.ts";
import type { GitHubAppEnv, GitHubAppFailed } from "./github-app.ts";
import { OWNER } from "./github-oidc.ts";

type MintInput = Readonly<{ env: GitHubAppEnv; grant: GitHubGrant }>;

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

const mintGitHubToken = (input: MintInput): Promise<Option.Option<string>> =>
  runMint(input.env, mint(input).pipe(Effect.orDie));

const BAD_GATEWAY = 502;

const sloppediaToken = (env: GitHubAppEnv): Effect.Effect<Response, never, GithubOpContext> =>
  mint({ env, grant: SLOPPEDIA_GITHUB_GRANT }).pipe(
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

class SloppediaGitHub extends WorkerEntrypoint<GitHubAppEnv> {
  public override fetch(): Promise<Response> {
    return runMint(this.env, sloppediaToken(this.env));
  }
}

export { SloppediaGitHub, mintGitHubToken };
export type { MintInput };
