import { Effect, Option } from "effect";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { parseScript, planTimeline } from "#/entities/script/index.ts";
import type { ScriptError, Timeline } from "#/entities/script/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { FONT } from "#/shared/config/index.ts";

import { SAMPLE } from "./sample.test.support.ts";
import { mountSheet } from "./sheet.test.support.tsx";

const FONT_CHECK = `800 40px "${FONT.text}"`;
const SPEAKER = "見本";
const FORMATS: readonly Format[] = ["vertical", "horizontal"];

const timelineOf = (format: Format): Effect.Effect<Timeline, ScriptError> =>
  parseScript(SAMPLE).pipe(
    Effect.flatMap((script) =>
      planTimeline({
        script,
        format,
        sources: {
          narration: {},
          narrationSrc: (key: string) => key,
          assetSrc: (url: string) => url,
          speakerName: Option.some(SPEAKER),
        },
      }),
    ),
  );

const fontsReady = Effect.promise(() =>
  expect.poll(() => document.fonts.check(FONT_CHECK, SPEAKER)).toBe(true),
);

test.each(FORMATS)("%s の全シーンが基準の見た目と変わらない", (format) =>
  Effect.gen(function* compare() {
    const timeline = yield* timelineOf(format);
    yield* mountSheet(timeline);
    yield* fontsReady;
    yield* Effect.promise(() => expect(page.getByRole("main")).toMatchScreenshot(format));
  }).pipe(Effect.scoped, Effect.runPromise),
);
