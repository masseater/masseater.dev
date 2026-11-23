import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { vi } from "vite-plus/test";

import { watashiRoutes } from "./watashi-routes.server.ts";

type Written = Readonly<{ status: "ok"; body: Readonly<{ written: readonly string[] }> }>;

vi.mock("cloudflare:workers", () => ({
  env: {
    WATASHI: {
      memoryWrite: (): Promise<Written> =>
        Promise.resolve({ status: "ok", body: { written: ["notes/today"] } }),
    },
  },
}));

const OK = 200;
const EDIT = '{"project":"notes","name":"today","description":"a memo","content":"text"}';
const FORM = "project=notes&name=today&description=a+memo&content=text";

const write = (contentType: string, body: string): Effect.Effect<number> =>
  Effect.promise(() =>
    watashiRoutes.handle(
      new Request("https://portal.example.com/api/watashi/memos", {
        method: "POST",
        headers: { "content-type": contentType },
        body,
      }),
    ),
  ).pipe(Effect.map(({ status }) => status));

it.effect("writes a memo sent as JSON", () =>
  Effect.gen(function* test() {
    const status = yield* write("application/json", EDIT);
    expect(status).toBe(OK);
  }),
);

it.effect("refuses a memo sent the way an HTML form sends it", () =>
  Effect.gen(function* test() {
    const status = yield* write("application/x-www-form-urlencoded", FORM);
    expect(status).not.toBe(OK);
  }),
);
