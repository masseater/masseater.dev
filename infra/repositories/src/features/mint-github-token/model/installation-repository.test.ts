import { Effect, Option, Ref } from "effect";
import { http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, test } from "vite-plus/test";

import { isSourceRepository } from "./installation-repository.ts";

const REPOSITORY = "https://api.github.com/repos/masseater/site";
const TOKEN = "obviously-fake-installation-token";
const NOT_FOUND = 404;

const network = setupServer();

beforeAll(() => {
  network.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.close();
});

const lookUp = (): Promise<boolean> => isSourceRepository({ token: TOKEN, repository: "site" });

const answeredWith = (respond: () => Response): Effect.Effect<boolean> =>
  Effect.sync(() => {
    network.use(http.get(REPOSITORY, respond));
  }).pipe(Effect.andThen(Effect.promise(lookUp)));

test("a repository GitHub does not call a fork is the owner's own", () =>
  Effect.runPromise(
    Effect.gen(function* source() {
      const answer = yield* answeredWith(() => Response.json({ name: "site", fork: false }));
      expect(answer).toBe(true);
    }),
  ));

test("a fork, an answer without the fork field and a failed lookup are all not the owner's own", () =>
  Effect.runPromise(
    Effect.gen(function* notSource() {
      const fork = yield* answeredWith(() => Response.json({ name: "site", fork: true }));
      const silent = yield* answeredWith(() => Response.json({ name: "site" }));
      const missing = yield* answeredWith(() =>
        Response.json({ message: "Not Found" }, { status: NOT_FOUND }),
      );
      expect([fork, silent, missing]).toStrictEqual([false, false, false]);
    }),
  ));

test("the lookup is made with the installation token it was given", () =>
  Effect.runPromise(
    Effect.gen(function* authorized() {
      const seen = yield* Ref.make(Option.none<string>());
      const context = yield* Effect.context();
      const record = (authorization: Option.Option<string>): Promise<Response> =>
        Effect.runPromiseWith(context)(
          Effect.as(Ref.set(seen, authorization), Response.json({ fork: false })),
        );
      network.use(
        http.get(REPOSITORY, ({ request }) =>
          record(Option.fromNullishOr(request.headers.get("authorization"))),
        ),
      );
      yield* Effect.promise(lookUp);
      const authorization = yield* Ref.get(seen);
      expect(authorization).toStrictEqual(Option.some(`Bearer ${TOKEN}`));
    }),
  ));
