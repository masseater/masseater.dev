import { makeD1 } from "@masseater.dev/d1-test";

const testD1 = makeD1({
  migrations: new URL("../../drizzle/", import.meta.url).href,
  tables: ["oauth_client_resource", "oauth_client", "oauth_resource", "verification"],
});

export const { closeDatabase, resetDatabase } = testD1;

export const env = {
  ...testD1.env,
  BETTER_AUTH_SECRET: "test-secret-with-enough-entropy-0123456789",
};
