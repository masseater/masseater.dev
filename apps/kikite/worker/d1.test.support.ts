import { makeD1 } from "@masseater.dev/d1-test";

const {
  closeDatabase,
  env: d1,
  resetDatabase,
} = makeD1({
  migrations: new URL("../migrations/", import.meta.url).href,
  tables: ["sessions"],
});

const env = { SESSIONS: d1.DB };

export { closeDatabase, env, resetDatabase };
