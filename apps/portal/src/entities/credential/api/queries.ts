import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api/index.ts";

import type { CredentialsRoutes } from "./credentials-routes.server";

const loadCredentialsHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server")).pipe(
      Effect.map((module) => module.handleCredentials),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<CredentialsRoutes>(loadCredentialsHandle))
  .client(() => browserClient<CredentialsRoutes>());

export const credentialsQueries = createQueries<CredentialsRoutes>(client()).api.credentials;
