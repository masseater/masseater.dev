import { attempt, createRouter, credentials, respond } from "#/shared/api/index.server.ts";

export const credentialsRoutes = createRouter("/api/credentials").get("/", () =>
  respond(attempt(() => credentials().list())),
);

export type CredentialsRoutes = typeof credentialsRoutes;
