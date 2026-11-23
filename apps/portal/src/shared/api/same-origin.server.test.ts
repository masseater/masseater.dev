import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { sameOriginWrites } from "./same-origin.server.ts";

type Sent = Readonly<{ method: string; headers: Readonly<Record<string, string>> }>;

const MEMOS = "https://portal.example.com/api/watashi/memos";
const ADMITTED = "admitted";
const REFUSED = "refused";

const { context }: Readonly<{ context?: never }> = {};

const admit = (): Promise<never> => Promise.reject(new Error(ADMITTED));

const answerTo = Effect.fn("answerTo")(function* answerTo({ method, headers }: Sent) {
  const serve = yield* Effect.fromOption(Option.fromUndefinedOr(sameOriginWrites.options.server));
  return yield* Effect.tryPromise({
    try: () =>
      Promise.resolve(
        serve({
          request: new Request(MEMOS, { method, headers }),
          pathname: "/api/watashi/memos",
          context,
          handlerType: "router",
          next: admit,
        }),
      ),
    catch: () => ADMITTED,
  }).pipe(Effect.match({ onFailure: () => ADMITTED, onSuccess: () => REFUSED }));
});

it.effect("refuses a write that another site makes the browser send", () =>
  Effect.gen(function* test() {
    const named = yield* answerTo({ method: "POST", headers: { origin: "https://evil.example" } });
    const marked = yield* answerTo({ method: "POST", headers: { "sec-fetch-site": "cross-site" } });
    expect([named, marked]).toStrictEqual([REFUSED, REFUSED]);
  }),
);

it.effect("admits a write from the portal's own page or from no browser", () =>
  Effect.gen(function* test() {
    const page = yield* answerTo({
      method: "POST",
      headers: { origin: "https://portal.example.com" },
    });
    const agent = yield* answerTo({ method: "POST", headers: {} });
    expect([page, agent]).toStrictEqual([ADMITTED, ADMITTED]);
  }),
);

it.effect("admits a read linked from another site", () =>
  Effect.gen(function* test() {
    const linked = yield* answerTo({ method: "GET", headers: { "sec-fetch-site": "cross-site" } });
    expect(linked).toBe(ADMITTED);
  }),
);
