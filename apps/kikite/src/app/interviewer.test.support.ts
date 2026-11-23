import { Array as Arr, MutableRef } from "effect";

import { env as stores } from "#/shared/lib/d1.test.support.ts";

export { closeDatabase, resetDatabase } from "#/shared/lib/d1.test.support.ts";

export const reached = MutableRef.make<readonly string[]>([]);

const interviewer = {
  fetch: (request: Request): Promise<Response> => {
    MutableRef.update(reached, Arr.append(new URL(request.url).pathname));
    return Promise.resolve(Response.json({ leads: [] }));
  },
};

export const env = { ...stores, INTERVIEWER: { getByName: (): typeof interviewer => interviewer } };

export const DurableObject = Object;
