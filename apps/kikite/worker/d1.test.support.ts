import { makeD1 } from "@masseater.dev/d1-test";

const testD1 = makeD1({
  migrations: new URL("../migrations/", import.meta.url).href,
  tables: ["sessions"],
});

export const { closeDatabase, resetDatabase } = testD1;
const { env: d1 } = testD1;

export const env = { SESSIONS: d1.DB };
