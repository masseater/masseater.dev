import { makeD1 } from "@masseater.dev/d1-test";
import { Effect } from "effect";

import type { AuthBindings } from "#/shared/auth/index.server.ts";

const testD1 = makeD1({
  migrations: new URL("../../drizzle/", import.meta.url).href,
  tables: ["oauth_client_resource", "oauth_client", "oauth_resource", "verification"],
});

export const { closeDatabase, resetDatabase } = testD1;

export const authBindings: Effect.Effect<AuthBindings> = testD1.database.pipe(
  Effect.map((DB) => ({ DB, BETTER_AUTH_SECRET: "test-secret-with-enough-entropy-0123456789" })),
);
