import { Array as Arr, Duration, Effect, Option, Queue, Schema, pipe } from "effect";
import type { Page } from "playwright";

import { findingOf } from "#/entities/finding/index.ts";
import type { Finding } from "#/entities/finding/index.ts";
import { linksScript } from "#/features/unleash-gremlins/model/guard-script.ts";
import { hordeScript } from "#/features/unleash-gremlins/model/horde-script.ts";
import { observationsOf } from "#/features/unleash-gremlins/model/observation-log.ts";
import type { LogItem } from "#/features/unleash-gremlins/model/observation-log.ts";
import { findingsOfObservations } from "#/features/unleash-gremlins/model/observation.ts";
import type { Surface } from "#/features/unleash-gremlins/model/observation.ts";
import { inBrowser } from "#/shared/lib/browser.ts";

const LOAD_TIMEOUT_SECONDS = 30;
const SETTLE_SECONDS = 2;
const CHUNKS = 4;
const ACTIONS_PER_CHUNK = 100;
const BAD_STATUS = 400;
const HORDE_TIMEOUT_SECONDS = 120;

const Links = Schema.Array(Schema.String);

export type PageRun = Readonly<{
  surface: Surface;
  page: Page;
  log: Queue.Queue<LogItem>;
  url: string;
  seed: number;
}>;

const entered = (run: PageRun): Effect.Effect<Option.Option<Finding>> =>
  inBrowser(() =>
    run.page.goto(run.url, {
      waitUntil: "load",
      timeout: Duration.toMillis(Duration.seconds(LOAD_TIMEOUT_SECONDS)),
    }),
  ).pipe(
    Effect.match({
      onFailure: (error) =>
        Option.some(
          findingOf({ kind: `${run.surface}-load`, target: run.url, detail: String(error) }),
        ),
      onSuccess: (response) =>
        pipe(
          Option.fromNullishOr(response),
          Option.filter((loaded) => loaded.status() >= BAD_STATUS),
          Option.map((loaded) =>
            findingOf({
              kind: `${run.surface}-load`,
              target: run.url,
              detail: `status ${String(loaded.status())}`,
            }),
          ),
        ),
    }),
  );

const chunk = (run: PageRun, index: number): Effect.Effect<void> =>
  Effect.gen(function* oneChunk() {
    yield* Queue.offer(run.log, { _tag: "phase", phase: "monkey" });
    yield* inBrowser(() =>
      run.page.evaluate(hordeScript({ seed: run.seed + index, actions: ACTIONS_PER_CHUNK })),
    ).pipe(Effect.timeout(Duration.seconds(HORDE_TIMEOUT_SECONDS)), Effect.ignore);
    yield* inBrowser(() => run.page.waitForLoadState("load")).pipe(Effect.ignore);
    yield* Queue.offer(run.log, { _tag: "phase", phase: "load" });
    yield* Effect.sleep(Duration.seconds(SETTLE_SECONDS));
  });

const settled = (run: PageRun): Effect.Effect<readonly Finding[]> =>
  Queue.clear(run.log).pipe(
    Effect.map((items) =>
      findingsOfObservations({
        surface: run.surface,
        target: run.url,
        observations: observationsOf(items),
      }),
    ),
  );

const unleashPage = Effect.fn("monkey.unleashPage")(function* unleashPage(run: PageRun) {
  yield* Queue.offer(run.log, { _tag: "phase", phase: "load" });
  const loadFailure = yield* entered(run);
  yield* Effect.sleep(Duration.seconds(SETTLE_SECONDS));
  yield* Effect.forEach(
    Arr.makeBy(CHUNKS, (index) => index),
    (index) => chunk(run, index),
    {
      concurrency: 1,
    },
  );
  const observed = yield* settled(run);
  return [...Option.toArray(loadFailure), ...observed];
});

const linksOf = (page: Page): Effect.Effect<readonly string[]> =>
  inBrowser(() => page.evaluate(linksScript)).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(Links)),
    Effect.orElseSucceed((): readonly string[] => []),
  );

/** @internal */
export const unleashOnPage = unleashPage;

/** @internal */
export const linksOnPage = linksOf;
