import { createRequire } from "node:module";

import { Effect, Match, Option, pipe } from "effect";
import type { Scope } from "effect";
import type { Browser, BrowserContext, Route } from "playwright";

import { guardScript } from "#/features/unleash-gremlins/model/guard-script.ts";
import { answerOf, carriesBearer } from "#/features/unleash-gremlins/model/request-rules.ts";
import type { RequestFacts } from "#/features/unleash-gremlins/model/request-rules.ts";
import { inBrowser } from "#/shared/lib/browser.ts";
import type { BrowserFailure } from "#/shared/lib/browser.ts";

export type Setup = Readonly<{
  origin: string;
  bearer: Option.Option<string>;
  init: Option.Option<string>;
}>;

const NO_CONTENT = 204;
const GREMLINS = createRequire(import.meta.url).resolve("gremlins.js/dist/gremlins.min.js");

const continued = (
  input: Readonly<{ setup: Setup; route: Route; facts: RequestFacts }>,
): Effect.Effect<void, BrowserFailure> => {
  const { setup, route, facts } = input;
  const withToken = pipe(
    setup.bearer,
    Option.filter(() => carriesBearer(facts)),
  );
  return Option.match(withToken, {
    onNone: () => inBrowser(() => route.continue()),
    onSome: (token) => {
      const headers = { ...route.request().headers(), authorization: `Bearer ${token}` };
      return inBrowser(() => route.continue({ headers }));
    },
  });
};

const handled = (
  input: Readonly<{ setup: Setup; route: Route }>,
): Effect.Effect<void, BrowserFailure> => {
  const { setup, route } = input;
  const request = route.request();
  const facts = {
    method: request.method(),
    url: request.url(),
    origin: setup.origin,
    isNavigation: request.isNavigationRequest(),
  };
  return Match.value(answerOf(facts)).pipe(
    Match.when("abort", () => inBrowser(() => route.abort())),
    Match.when("fulfill", () => inBrowser(() => route.fulfill({ status: NO_CONTENT }))),
    Match.orElse(() => continued({ setup, route, facts })),
  );
};

const configured = (
  input: Readonly<{ context: BrowserContext; setup: Setup }>,
): Effect.Effect<void, BrowserFailure> =>
  Effect.gen(function* configure() {
    const { context, setup } = input;
    const services = yield* Effect.context();
    const run = Effect.runPromiseWith(services);
    yield* inBrowser(() =>
      context.route("**/*", (route) => run(handled({ setup, route }).pipe(Effect.ignore))),
    );
    yield* inBrowser(() => context.addInitScript({ content: guardScript }));
    yield* inBrowser(() => context.addInitScript({ path: GREMLINS }));
    if (Option.isSome(setup.init)) {
      const content = setup.init.value;
      yield* inBrowser(() => context.addInitScript({ content }));
    }
  });

const opened = (
  input: Readonly<{ browser: Browser; setup: Setup }>,
): Effect.Effect<BrowserContext, BrowserFailure, Scope.Scope> =>
  Effect.acquireRelease(
    inBrowser(() => input.browser.newContext()),
    (context) => Effect.promise(() => context.close()),
  ).pipe(Effect.tap((context) => configured({ context, setup: input.setup })));

/** @internal */
export const openContext = opened;
