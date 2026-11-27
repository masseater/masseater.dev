import { attempt, createRouter, respond } from "#/shared/api/index.server.ts";

export const credentialsRoutes = createRouter("/api/credentials").get("/", ({ request }) =>
  respond(request)(attempt(({ CREDENTIALS }) => CREDENTIALS.list())),
);

export type CredentialsRoutes = typeof credentialsRoutes;
