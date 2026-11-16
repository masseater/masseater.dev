import { makeD1 } from "@masseater.dev/d1-test";

const testD1 = makeD1({
  migrations: new URL("../../../../migrations/", import.meta.url).href,
  tables: ["marks"],
});

const { env: d1 } = testD1;

export const { closeDatabase, resetDatabase } = testD1;

export const env = { MARKS: d1.DB };
