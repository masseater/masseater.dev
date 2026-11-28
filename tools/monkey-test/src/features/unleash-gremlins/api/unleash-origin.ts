import { Array as Arr, Boolean as Bool, Effect, pipe } from "effect";
import type { Browser, Page } from "playwright";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";
import { openContext } from "#/features/unleash-gremlins/api/open-context.ts";
import { linksOnPage, unleashOnPage } from "#/features/unleash-gremlins/api/unleash-page.ts";
import { watchPageLog } from "#/features/unleash-gremlins/api/watch-page.ts";
import { pagesOf } from "#/features/unleash-gremlins/model/pages.ts";
import type { Target } from "#/features/unleash-gremlins/model/targets.ts";
import { inBrowser } from "#/shared/lib/browser.ts";

const SEEDS_PER_PAGE = 10;

const discovered = (
  input: Readonly<{ page: Page; target: Target }>,
): Effect.Effect<readonly string[]> =>
  Bool.match(input.target.discover, {
    onTrue: () =>
      inBrowser(() => input.page.goto(`${input.target.origin}/`)).pipe(
        Effect.andThen(linksOnPage(input.page)),
        Effect.orElseSucceed((): readonly string[] => []),
      ),
    onFalse: () => Effect.succeed([]),
  });

const unleashed = Effect.fn("monkey.origin")(function* unleashed(
  input: Readonly<{ browser: Browser; target: Target }>,
) {
  const { target } = input;
  const context = yield* openContext({
    browser: input.browser,
    setup: { origin: target.origin, bearer: target.bearer, init: target.init },
  });
  const page = yield* inBrowser(() => context.newPage());
  const log = yield* watchPageLog(page);
  const hrefs = yield* discovered({ page, target });
  const found = yield* Effect.forEach(
    pagesOf({ origin: target.origin, hrefs }),
    (url, index) =>
      unleashOnPage({
        surface: target.surface,
        page,
        log,
        url,
        seed: target.seed + index * SEEDS_PER_PAGE,
      }),
    { concurrency: 1 },
  );
  return pipe(found, Arr.flatten);
});

const failed = (target: Target, message: string): readonly Finding[] => [
  findingOf({ kind: `${target.surface}-load`, target: target.origin, detail: message }),
];

const safely = (
  input: Readonly<{ browser: Browser; target: Target }>,
): Effect.Effect<readonly Finding[]> =>
  Effect.scoped(unleashed(input)).pipe(
    Effect.match({
      onFailure: ({ message }) => failed(input.target, message),
      onSuccess: (found): readonly Finding[] => found,
    }),
  );

/** @internal */
export const unleashOrigin = safely;
