import { makeD1 } from "@masseater.dev/d1-test";
import { Array as Arr, MutableRef } from "effect";

const testD1 = makeD1({
  migrations: new URL("../../migrations/", import.meta.url).href,
  tables: ["sessions"],
});

export const { closeDatabase, resetDatabase } = testD1;

export const reached = MutableRef.make<readonly string[]>([]);

const interviewer = {
  fetch: (request: Request): Promise<Response> => {
    MutableRef.update(reached, Arr.append(new URL(request.url).pathname));
    return Promise.resolve(Response.json({ leads: [] }));
  },
};

export const env = {
  SESSIONS: testD1.env.DB,
  INTERVIEWER: { getByName: (): typeof interviewer => interviewer },
};

export const DurableObject = Object;
