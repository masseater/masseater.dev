import { expect, it } from "@effect/vitest";
import { Effect, MutableRef } from "effect";
import { afterAll, beforeEach } from "vite-plus/test";

import { frontDoor } from "./front-door.ts";
import { bindings, closeDatabase, reached, resetDatabase } from "./interviewer.test.support.ts";

type Sent = Readonly<{
  path: string;
  method: string;
  headers: Readonly<Record<string, string>>;
}>;

const ORIGIN = "https://kikite.test";
const OK = 200;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const UNSUPPORTED_MEDIA_TYPE = 415;
const JSON_BODY = { "content-type": "application/json" };
const FROM_ANOTHER_SITE = { ...JSON_BODY, origin: "https://evil.example" };
const AS_A_FORM = { "content-type": "text/plain" };
const CORRECTION = "/api/correction";
const WRITES = [
  { path: CORRECTION, method: "POST" },
  { path: "/api/research", method: "POST" },
  { path: "/api/sessions/0b6f7c1e-2f3a-4d5b-8c9d-0e1f2a3b4c5d", method: "PUT" },
];

const statusOf = ({ path, method, headers }: Sent): Effect.Effect<number> =>
  bindings.pipe(
    Effect.flatMap((bound) =>
      Effect.promise(() =>
        frontDoor(bound)(new Request(`${ORIGIN}${path}`, { method, headers, body: "{}" })),
      ),
    ),
    Effect.map(({ status }) => status),
  );

const statusesWith = (
  headers: Readonly<Record<string, string>>,
): Effect.Effect<readonly number[]> =>
  Effect.forEach(WRITES, (write) => statusOf({ ...write, headers }), { concurrency: 1 });

beforeEach(() => {
  MutableRef.set(reached, []);
  return Effect.runPromise(resetDatabase);
});
afterAll(() => Effect.runPromise(closeDatabase));

it.effect("refuses every write that another site makes the browser send", () =>
  Effect.gen(function* test() {
    const statuses = yield* statusesWith(FROM_ANOTHER_SITE);
    expect(statuses).toStrictEqual([FORBIDDEN, FORBIDDEN, FORBIDDEN]);
    expect(MutableRef.get(reached)).toStrictEqual([]);
  }),
);

it.effect("refuses every body that is not sent as JSON", () =>
  Effect.gen(function* test() {
    const statuses = yield* statusesWith(AS_A_FORM);
    expect(statuses).toStrictEqual([
      UNSUPPORTED_MEDIA_TYPE,
      UNSUPPORTED_MEDIA_TYPE,
      UNSUPPORTED_MEDIA_TYPE,
    ]);
    expect(MutableRef.get(reached)).toStrictEqual([]);
  }),
);

it.effect("hands the interviewer a write from its own page or from no browser", () =>
  Effect.gen(function* test() {
    const page = yield* statusOf({
      path: CORRECTION,
      method: "POST",
      headers: { ...JSON_BODY, origin: ORIGIN },
    });
    const agent = yield* statusOf({ path: CORRECTION, method: "POST", headers: JSON_BODY });
    expect([page, agent]).toStrictEqual([OK, OK]);
    expect(MutableRef.get(reached)).toStrictEqual([CORRECTION, CORRECTION]);
  }),
);

it.effect("does not start the interviewer for a path it does not serve", () =>
  Effect.gen(function* test() {
    const unknown = yield* statusOf({ path: "/api/unknown", method: "POST", headers: JSON_BODY });
    expect(unknown).toBe(NOT_FOUND);
    expect(MutableRef.get(reached)).toStrictEqual([]);
  }),
);
