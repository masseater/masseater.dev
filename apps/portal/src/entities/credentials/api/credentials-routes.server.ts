import { attempt, createRouter, credentials, respond } from "#/shared/api/index.server";

const credentialsRoutes = createRouter("/api/credentials").get("/", () =>
  respond(attempt(() => credentials().list())),
);

type CredentialsRoutes = typeof credentialsRoutes;

export { credentialsRoutes };
export type { CredentialsRoutes };
