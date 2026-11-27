import { expect, it } from "@effect/vitest";
import type { PortalResult } from "@masseater.dev/portal-protocol";
import { Effect } from "effect";

import { servingUpstreams } from "#/shared/api/index.server.ts";
import type { UpstreamBindings } from "#/shared/api/index.test.support.ts";

import { watashiRoutes } from "./watashi-routes.server.ts";

const OK = 200;
const EDIT = '{"project":"notes","name":"today","description":"a memo","content":"text"}';
const FORM = "project=notes&name=today&description=a+memo&content=text";

const written = (): Promise<PortalResult> =>
  Promise.resolve({ status: "ok", body: { written: ["notes/today"] } });

const unused = (): Promise<never> => Promise.reject(new Error("not called in this test"));

const upstreams: UpstreamBindings = {
  PERSONAL: { fetch: unused },
  WATASHI: {
    lifeRead: unused,
    memoryRead: unused,
    memoryWrite: written,
    memoryProjects: unused,
    memoryViews: unused,
    profile: unused,
    conversationRead: unused,
  },
  MONEY: { read: unused },
  SLIDES: { search: unused },
  CREDENTIALS: { list: unused },
};

const handle = servingUpstreams(upstreams)(watashiRoutes.handle);

const write = (contentType: string, body: string): Effect.Effect<number> =>
  Effect.promise(() =>
    handle(
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
