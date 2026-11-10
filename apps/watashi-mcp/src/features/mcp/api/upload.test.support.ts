import { makeD1 } from "@masseater.dev/d1-test";

const {
  closeDatabase,
  env: database,
  resetDatabase,
} = makeD1({
  migrations: new URL("../../../../drizzle/", import.meta.url).href,
  tables: ["conversation_chunk", "conversation_session", "api_token"],
});

const objects = new Map<string, Uint8Array>();

const refusedPuts = new Set<string>();

const CONVERSATIONS = {
  put: (key: string, body: Uint8Array): Promise<void> => {
    if (refusedPuts.has(key)) {
      return Promise.reject(new Error("R2 is down"));
    }
    objects.set(key, body);
    return Promise.resolve();
  },
  delete: (key: string): Promise<void> => {
    objects.delete(key);
    return Promise.resolve();
  },
};

const points: unknown[] = [];

const CONVERSATION_UPLOADS = {
  writeDataPoint: (point: unknown): void => {
    points.push(point);
  },
};

const env = { ...database, CONVERSATIONS, CONVERSATION_UPLOADS };

export { closeDatabase, env, objects, points, refusedPuts, resetDatabase };
