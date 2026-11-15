import { makeD1 } from "@masseater.dev/d1-test";

export const { closeDatabase, env, resetDatabase } = makeD1({
  migrations: new URL("migrations/", import.meta.url).href,
  tables: ["documents"],
});
