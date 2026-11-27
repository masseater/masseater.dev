import { Effect, Option } from "effect";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { planTimeline } from "#/entities/cut/index.ts";
import type { Timeline } from "#/entities/cut/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { FONT } from "#/shared/config/index.ts";

import { SAMPLE } from "./sample.test.support.tsx";
import { mountSheet } from "./sheet.test.support.tsx";

const FONT_CHECK = `700 40px "${FONT.bold}"`;
const SPEAKER = "見本";
const FORMATS: readonly Format[] = ["vertical", "horizontal"];
const FONT_TIMEOUT_MS = 15_000;

const timelineOf = (format: Format): Effect.Effect<Timeline> =>
  planTimeline({
    script: SAMPLE,
    format,
    sources: {
      narration: {},
      narrationSrc: (key: string) => key,
      assetSrc: (url: string) => url,
      speakerName: Option.some(SPEAKER),
      tachie: Option.none(),
    },
  });

const fontsReady = Effect.promise(() =>
  expect
    .poll(() => document.fonts.check(FONT_CHECK, SPEAKER), { timeout: FONT_TIMEOUT_MS })
    .toBe(true),
);

test.each(FORMATS)("%s の全カットが基準の見た目と変わらない", (format) =>
  Effect.gen(function* compare() {
    const timeline = yield* timelineOf(format);
    yield* mountSheet(timeline);
    yield* fontsReady;
    yield* Effect.promise(() => expect(page.getByRole("main")).toMatchScreenshot(format));
  }).pipe(Effect.scoped, Effect.runPromise),
);
