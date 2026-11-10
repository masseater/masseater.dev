import { makeD1 } from "@masseater.dev/d1-test";

const { closeDatabase, env, resetDatabase } = makeD1({
  migrations: new URL("../../../../drizzle/", import.meta.url).href,
  tables: ["life_record", "memory", "revision"],
});

export { closeDatabase, env, resetDatabase };
