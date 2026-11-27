import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { planTimeline } from "#/entities/cut/index.ts";
import type { Cut, Timeline, VideoScript } from "#/entities/cut/index.ts";

import { checkScript } from "./check.ts";

const LONG_LINE = 30;
const TOO_LONG_CAPTION = 40;
const MANY_CUTS = 8;
const SHORT_TARGET = 10;
const LONG_TARGET = 60;
const NO_ISSUES: readonly string[] = [];

const scriptOf = ({
  cuts,
  length,
}: Readonly<{ cuts: readonly Cut[]; length: number }>): VideoScript => ({
  title: "t",
  formats: ["vertical"],
  length: { vertical: length },
  voice: 0,
  readings: {},
  cuts,
});

const timelineOf = (script: VideoScript): Effect.Effect<Timeline> =>
  planTimeline({
    script,
    format: "vertical",
    sources: {
      narration: {},
      narrationSrc: (key: string) => key,
      assetSrc: (url: string) => url,
      speakerName: Option.none(),
      tachie: Option.none(),
    },
  });

const idsOf = (script: VideoScript): readonly string[] =>
  pipe(
    script.cuts,
    Arr.map(({ id }) => id),
  );

const messagesOf = ({
  script,
  drawn,
}: Readonly<{ script: VideoScript; drawn: readonly string[] }>): Effect.Effect<readonly string[]> =>
  timelineOf(script).pipe(
    Effect.map((timeline) => checkScript({ script, timelines: [timeline], drawn })),
    Effect.map(Arr.map(({ message }) => message)),
  );

const issuesOf = (script: VideoScript): Effect.Effect<readonly string[]> =>
  messagesOf({ script, drawn: idsOf(script) });

const mentions = (issues: readonly string[], text: string): boolean =>
  pipe(issues, Arr.some(Str.includes(text)));

const longCuts = (count: number): readonly Cut[] =>
  Arr.makeBy(count, (position) => ({
    id: `c${String(position)}`,
    say: [`${Str.repeat(LONG_LINE)("あ")}。`],
  }));

test("短い台本は通る", () =>
  Effect.runPromise(
    Effect.gen(function* passes() {
      const issues = yield* issuesOf(
        scriptOf({ cuts: [{ id: "a", say: ["**短く**言う。"] }], length: LONG_TARGET }),
      );
      expect(issues).toStrictEqual(NO_ISSUES);
    }),
  ));

test("目標の長さを超えると指摘する", () =>
  Effect.runPromise(
    Effect.gen(function* tooLong() {
      const issues = yield* issuesOf(scriptOf({ cuts: longCuts(MANY_CUTS), length: SHORT_TARGET }));
      expect(mentions(issues, "目標 10 秒")).toBe(true);
    }),
  ));

test("長すぎる字幕を指摘する", () =>
  Effect.runPromise(
    Effect.gen(function* caption() {
      const issues = yield* issuesOf(
        scriptOf({
          cuts: [{ id: "a", say: [Str.repeat(TOO_LONG_CAPTION)("い")] }],
          length: LONG_TARGET,
        }),
      );
      expect(mentions(issues, "32 文字を超えている")).toBe(true);
    }),
  ));

test("同じカット名と絵のないカットを指摘する", () =>
  Effect.runPromise(
    Effect.gen(function* ids() {
      const issues = yield* messagesOf({
        script: scriptOf({
          cuts: [
            { id: "a", say: ["一。"] },
            { id: "a", say: ["二。"] },
          ],
          length: LONG_TARGET,
        }),
        drawn: [],
      });
      expect(issues).toStrictEqual([
        "カット a が 2 回以上ある",
        "カット a の絵が video.tsx にない",
      ]);
    }),
  ));
