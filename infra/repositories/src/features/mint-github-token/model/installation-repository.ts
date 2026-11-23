import {
  Credentials,
  DEFAULT_API_BASE_URL,
  DEFAULT_USER_AGENT,
  repos,
} from "@distilled.cloud/github";
import type { Config, GithubOpContext } from "@distilled.cloud/github";
import { runner } from "@r_masseater/workers-tracing/effect";
import { DateTime, Effect, Layer, Logger, Redacted, Schema } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { OWNER } from "#/entities/credential/index.ts";

export type InstallationToken = Readonly<{ token: string; issuedAt: number }>;

export type InstallationRepository = Readonly<{ token: string; repository: string }>;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const isSource = Schema.is(Schema.Struct({ fork: Schema.Literal(false) }));

export const installationCredentials = ({
  token,
  issuedAt,
}: InstallationToken): Effect.Effect<Config> =>
  Effect.succeed({
    token: Redacted.make(token),
    apiBaseUrl: DEFAULT_API_BASE_URL,
    userAgent: DEFAULT_USER_AGENT,
    issuedAt,
  });

const credentialsOf = (token: string): Effect.Effect<Effect.Effect<Config>> =>
  DateTime.now.pipe(
    Effect.map((now) => installationCredentials({ token, issuedAt: DateTime.toEpochMillis(now) })),
  );

const readSource = ({
  token,
  repository,
}: InstallationRepository): Effect.Effect<boolean, never, Exclude<GithubOpContext, Credentials>> =>
  repos.get({ owner: OWNER, repo: repository }).pipe(
    Effect.provideServiceEffect(Credentials, credentialsOf(token)),
    Effect.map(isSource),
    Effect.tapError((failure) => Effect.logWarning("github_app.repository_unreadable", failure)),
    Effect.orElseSucceed(() => false),
  );

export const isSourceRepository = (input: InstallationRepository): Promise<boolean> =>
  runner(Layer.mergeAll(logger, fetchHttpClient))(readSource(input));
