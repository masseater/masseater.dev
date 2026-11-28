import { Launcher } from "chrome-launcher";
import { Array as Arr, Duration, Effect, Match, Option, Schedule, Schema, pipe } from "effect";
import type { Scope } from "effect";
import { launch } from "puppeteer-core";
import type { Browser, CDPSession, Page, Viewport } from "puppeteer-core";

import { measurementOf } from "#/features/measure-zoom/model/metrics.ts";
import type { Measurement } from "#/features/measure-zoom/model/metrics.ts";
import {
  readPage,
  recordCommits,
  recordEntries,
  recordFrames,
  recordInputs,
  startRecording,
} from "#/features/measure-zoom/model/probe.ts";
import { PageSnapshotSchema, recordedSince } from "#/features/measure-zoom/model/recording.ts";
import type { PageSnapshot } from "#/features/measure-zoom/model/recording.ts";
import { POINTER, VIEWPORT, sentInputsOf } from "#/features/measure-zoom/model/sequences.ts";
import type { Scale, Sequence, Step } from "#/features/measure-zoom/model/sequences.ts";
import { widthOf } from "#/features/measure-zoom/model/zoom.ts";

const QUIET_MS = 500;
const POLL_MS = 50;
const SETTLE_TIMEOUT_SECONDS = 20;
const NEVER = 0;
const FIRST = 0;
const LAST_OFFSET = 1;
const DOUBLE = 2;
const REAL_SCALE = 0;

const taggedError = Schema.TaggedError;

export class BrowserError extends taggedError<BrowserError, { readonly brand: unique symbol }>()(
  "BrowserError",
  { cause: Schema.Unknown },
) {}

const POLL = Schedule.spaced(Duration.millis(POLL_MS));

const NOT_SETTLED = BrowserError.make({ cause: "The page did not commit a viewBox." });

const attempt = <Value>(evaluate: () => Promise<Value>): Effect.Effect<Value, BrowserError> =>
  Effect.tryPromise({ try: evaluate, catch: (cause) => BrowserError.make({ cause }) });

const executable = Effect.gen(function* executable() {
  const installation = yield* Effect.try({
    try: () => Launcher.getFirstInstallation(),
    catch: (cause) => BrowserError.make({ cause }),
  });
  return yield* Option.fromNullishOr(installation).pipe(
    Effect.fromOption,
    Effect.mapError(() =>
      BrowserError.make({ cause: "Chrome was not found. Set CHROME_PATH to its executable." }),
    ),
  );
});

const launchOptionsOf = (scale: Scale): Readonly<{ args: readonly string[]; viewport: Viewport }> =>
  Match.value(scale).pipe(
    Match.discriminatorsExhaustive("kind")({
      device: ({ factor }) => ({
        args: [`--force-device-scale-factor=${factor.toString()}`],
        viewport: { ...VIEWPORT, deviceScaleFactor: REAL_SCALE },
      }),
      emulated: ({ factor }) => ({
        args: [],
        viewport: { ...VIEWPORT, deviceScaleFactor: factor },
      }),
    }),
  );

export const openBrowser = ({
  chromeFlags,
  scale,
}: Readonly<{ chromeFlags: readonly string[]; scale: Scale }>): Effect.Effect<
  Browser,
  BrowserError,
  Scope.Scope
> => {
  const { args, viewport } = launchOptionsOf(scale);
  return Effect.acquireRelease(
    pipe(
      executable,
      Effect.flatMap((executablePath) =>
        attempt(() =>
          launch({ executablePath, args: [...chromeFlags, ...args], defaultViewport: viewport }),
        ),
      ),
    ),
    (browser) => Effect.promise(() => browser.close()),
  );
};

const snapshotOf = (page: Page): Effect.Effect<PageSnapshot, BrowserError> =>
  attempt(() => page.evaluate(readPage)).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(PageSnapshotSchema)),
    Effect.mapError((cause) => BrowserError.make({ cause })),
  );

const isSettled = ({ recording, now }: PageSnapshot): boolean => {
  const lastInput = pipe(
    Arr.last(recording.inputs),
    Option.map((input) => input.handledAt),
    Option.getOrElse(() => NEVER),
  );
  const lastCommit = pipe(
    Arr.last(recording.commits),
    Option.map((commit) => commit.at),
    Option.getOrElse(() => NEVER),
  );
  return lastCommit > lastInput && now - lastCommit > QUIET_MS;
};

const settle = (page: Page): Effect.Effect<PageSnapshot, BrowserError> =>
  snapshotOf(page).pipe(
    Effect.repeat({ schedule: POLL, until: isSettled }),
    Effect.timeoutOrElse({
      duration: Duration.seconds(SETTLE_TIMEOUT_SECONDS),
      orElse: () => Effect.fail(NOT_SETTLED),
    }),
  );

const wheelAt = (session: CDPSession, deltaY: number): Effect.Effect<unknown, BrowserError> =>
  attempt(() =>
    session.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: POINTER.x,
      y: POINTER.y,
      deltaX: NEVER,
      deltaY,
    }),
  );

const wheels = (
  session: CDPSession,
  { deltaY, count, gapMs }: Readonly<{ deltaY: number; count: number; gapMs: number }>,
): Effect.Effect<void, BrowserError> =>
  Effect.forEach(
    Arr.range(FIRST, count - LAST_OFFSET),
    (index) =>
      Effect.sleep(Duration.millis(index * gapMs)).pipe(Effect.andThen(wheelAt(session, deltaY))),
    { concurrency: "unbounded", discard: true },
  );

const perform = ({
  page,
  session,
  step,
}: Readonly<{ page: Page; session: CDPSession; step: Step }>): Effect.Effect<void, BrowserError> =>
  Match.value(step).pipe(
    Match.discriminatorsExhaustive("kind")({
      wheel: (wheel) => wheels(session, wheel),
      dblclick: () => attempt(() => page.mouse.click(POINTER.x, POINTER.y, { count: DOUBLE })),
      click: ({ selector }) => attempt(() => page.click(selector)),
      settle: () => Effect.asVoid(settle(page)),
    }),
  );

const PROBES = [startRecording, recordInputs, recordFrames, recordEntries, recordCommits];

const loadPage = Effect.fn("holons.zoom.load")(function* loadPage({
  browser,
  url,
}: Readonly<{ browser: Browser; url: string }>) {
  const page = yield* Effect.acquireRelease(
    attempt(() => browser.newPage()),
    (opened) => Effect.promise(() => opened.close()),
  );
  yield* Effect.forEach(PROBES, (probe) => attempt(() => page.evaluateOnNewDocument(probe)), {
    concurrency: 1,
    discard: true,
  });
  yield* attempt(() => page.goto(url, { waitUntil: "load" }));
  yield* attempt(() => page.evaluate(() => document.fonts.ready.then((fonts) => fonts.size)));
  const loaded = yield* settle(page);
  const fullWidth = yield* Effect.fromOption(widthOf(loaded.viewBox)).pipe(
    Effect.mapError(() => BrowserError.make({ cause: `No viewBox width in "${loaded.viewBox}".` })),
  );
  return { page, fullWidth, since: loaded.now };
});

export const measureSequence = Effect.fn("holons.zoom.sequence")(function* measureSequence({
  browser,
  url,
  sequence,
}: Readonly<{ browser: Browser; url: string; sequence: Sequence }>) {
  yield* Effect.annotateCurrentSpan({ url, sequence: sequence.name });
  const { page, fullWidth, since } = yield* loadPage({ browser, url });
  const session = yield* attempt(() => page.createCDPSession());
  yield* attempt(() => page.mouse.move(POINTER.x, POINTER.y));
  yield* Effect.forEach(sequence.steps, (step) => perform({ page, session, step }), {
    concurrency: 1,
    discard: true,
  });
  const { recording, viewBox, devicePixelRatio } = yield* settle(page);
  const measurement: Measurement = measurementOf({
    devicePixelRatio,
    recording: recordedSince({ recording, since }),
    viewBox,
    sent: sentInputsOf(sequence),
    fullWidth,
  });
  const { frameIntervalsMs: _intervals, ...numbers } = measurement;
  yield* Effect.annotateCurrentSpan(numbers);
  return measurement;
}, Effect.scoped);
