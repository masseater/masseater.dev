import { Effect, Schema } from "effect";
import type { Scope } from "effect";
import { chromium } from "playwright";
import type { Browser } from "playwright";

const taggedError = Schema.TaggedError;

export class BrowserFailure extends taggedError<
  BrowserFailure,
  { readonly brand: unique symbol }
>()("BrowserFailure", { message: Schema.String }) {}

const launched: Effect.Effect<Browser, never, Scope.Scope> = Effect.acquireRelease(
  Effect.promise(() => chromium.launch()),
  (browser) => Effect.promise(() => browser.close()),
);

export const launchBrowser = launched;

export const inBrowser = <Value>(run: () => Promise<Value>): Effect.Effect<Value, BrowserFailure> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => BrowserFailure.make({ message: String(cause) }),
  });
