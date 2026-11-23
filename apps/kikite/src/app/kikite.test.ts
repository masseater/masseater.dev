import { Array as Arr, Effect, MutableRef } from "effect";
import { afterAll, beforeEach, expect, test, vi } from "vite-plus/test";

import { closeDatabase, resetDatabase } from "#/shared/lib/d1.test.support.ts";

import worker from "./kikite.ts";

const reached = MutableRef.make<readonly Request[]>([]);

vi.mock("cloudflare:workers", async () => {
  const { env } = await import("#/shared/lib/d1.test.support.ts");
  class DurableObject {
    protected readonly ctx: unknown;
    public constructor(ctx: unknown) {
      this.ctx = ctx;
    }
  }
  const container = {
    running: true,
    getTcpPort: () => ({
      fetch: (url: string, init: RequestInit) => {
        MutableRef.update(reached, Arr.append(new Request(url, init)));
        return Promise.resolve(Response.json({ leads: [] }));
      },
    }),
  };
  return {
    DurableObject,
    env: {
      ...env,
      INTERVIEWER: {
        getByName: () => ({
          fetch: async (request: Request) => {
            const { Interviewer } = await import("./kikite.ts");
            return Reflect.construct(Interviewer, [{ container }, {}]).fetch(request);
          },
        }),
      },
    },
  };
});

const ORIGIN = "https://kikite.test";
const OK = 200;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const UNSUPPORTED_MEDIA_TYPE = 415;
const JSON_BODY = { "content-type": "application/json" };
const CORRECTION = JSON.stringify({ context: "", lines: [] });

const send = (
  path: string,
  init: Readonly<{ method: string; headers: Readonly<Record<string, string>>; body?: string }>,
): Promise<Response> => worker.fetch(new Request(`${ORIGIN}${path}`, init));

const correct = (headers: Readonly<Record<string, string>>): Promise<Response> =>
  send("/api/correction", { method: "POST", headers, body: CORRECTION });

beforeEach(async () => {
  MutableRef.set(reached, []);
  await Effect.runPromise(resetDatabase);
});
afterAll(() => Effect.runPromise(closeDatabase));

test("hands the interviewer a request without the caller's credentials", async () => {
  const response = await correct({
    ...JSON_BODY,
    origin: ORIGIN,
    cookie: "CF_Authorization=session",
    authorization: "Bearer token",
    "cf-access-jwt-assertion": "jwt",
    "cf-access-authenticated-user-email": "owner@example.com",
  });
  expect(response.status).toBe(OK);
  const [forwarded] = MutableRef.get(reached);
  expect([...(forwarded?.headers.keys() ?? [])].toSorted()).toStrictEqual([
    "content-type",
    "origin",
  ]);
});

test("does not start the interviewer for a path it does not serve", async () => {
  const response = await send("/api/unknown", { method: "GET", headers: {} });
  expect(response.status).toBe(NOT_FOUND);
  expect(MutableRef.get(reached)).toStrictEqual([]);
});

test.each([
  { path: "/api/correction", body: CORRECTION },
  { path: "/api/research", body: "{}" },
  { path: "/api/sessions/0b6f7c1e-2f3a-4d5b-8c9d-0e1f2a3b4c5d", body: "{}" },
])("refuses a write to $path that another site makes the browser send", async ({ path, body }) => {
  const method = path.startsWith("/api/sessions") ? "PUT" : "POST";
  const response = await send(path, {
    method,
    headers: { ...JSON_BODY, origin: "https://evil.example" },
    body,
  });
  expect(response.status).toBe(FORBIDDEN);
});

test.each([
  { path: "/api/correction", method: "POST" },
  { path: "/api/research", method: "POST" },
  { path: "/api/sessions/0b6f7c1e-2f3a-4d5b-8c9d-0e1f2a3b4c5d", method: "PUT" },
])("refuses a body for $path that is not sent as JSON", async ({ path, method }) => {
  const response = await send(path, {
    method,
    headers: { "content-type": "text/plain" },
    body: CORRECTION,
  });
  expect(response.status).toBe(UNSUPPORTED_MEDIA_TYPE);
  expect(MutableRef.get(reached)).toStrictEqual([]);
});

test("takes a write from a client that is not a browser", async () => {
  const response = await correct(JSON_BODY);
  expect(response.status).toBe(OK);
});
