import { makeD1 } from "@masseater.dev/d1-test";

const { closeDatabase, env, resetDatabase } = makeD1({
  migrations: new URL("../../../../drizzle/", import.meta.url).href,
  tables: ["part_staff", "part", "person_alias", "song_alias", "person", "song", "video"],
});

export { closeDatabase, env, resetDatabase };
