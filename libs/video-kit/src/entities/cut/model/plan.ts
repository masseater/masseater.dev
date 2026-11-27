import { Array as Arr, Effect, Number as Num, Option, Record as Rec, pipe } from "effect";

import type { Format } from "#/shared/config/index.ts";
import { FPS, FRAMES, NOTHING, ONE, SFX, SFX_CREDIT, Timing } from "#/shared/config/index.ts";

import type { Cut, VideoScript } from "./cut.ts";
import { isIn, voiceOf, voicesOf } from "./cut.ts";
import { frames } from "./frames.ts";
import { timeLines } from "./lines.ts";
import type { Sources, TimedCut, TimedLine, Timeline } from "./timeline.ts";

const spokenLength = (lines: readonly TimedLine[]): number =>
  Option.match(Arr.last(lines), {
    onNone: () => frames(Timing.EMPTY_SCENE_SECONDS),
    onSome: ({ from, duration }) => from + duration + frames(Timing.SCENE_PADDING_SECONDS),
  });

const timeCut = (
  script: VideoScript,
  cut: Cut,
  sources: Sources,
): Effect.Effect<Omit<TimedCut, "from">> =>
  timeLines({ script, cut, sources }).pipe(
    Effect.map((lines) => ({
      id: cut.id,
      voice: voiceOf(script)(cut),
      lines,
      duration: spokenLength(lines) + frames(cut.hold ?? NOTHING),
    })),
  );

const bgmOf = (script: VideoScript, sources: Sources): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(script.bgm),
    Option.map(({ url }) => sources.assetSrc(url)),
  );

const NO_CREDITS: readonly string[] = [];
const NO_IMAGES: Readonly<Record<string, string>> = {};

const creditsOf = (script: VideoScript, sources: Sources): readonly string[] => [
  ...pipe(
    voicesOf(script),
    Arr.flatMap((voice) => Option.toArray(Rec.get(sources.speakers, String(voice)))),
    Arr.dedupe,
    Arr.map((name) => `VOICEVOX:${name}`),
  ),
  ...Option.match(Option.fromNullishOr(script.bgm), {
    onNone: () => NO_CREDITS,
    onSome: ({ credit }) => [`BGM:${credit}`],
  }),
  `効果音:${SFX_CREDIT}`,
];

const place = (cuts: readonly Omit<TimedCut, "from">[]): readonly TimedCut[] =>
  pipe(
    cuts,
    Arr.mapAccum(NOTHING, (from, timed) => [from + timed.duration, { ...timed, from }]),
    ([, placed]) => placed,
  );

const totalOf = (cuts: readonly TimedCut[]): number =>
  pipe(
    cuts,
    Arr.map(({ duration }) => duration),
    (durations) => Num.sumAll(durations),
  );

const cutsIn = (script: VideoScript, format: Format): readonly Cut[] =>
  pipe(script.cuts, Arr.filter(isIn(format)));

export interface PlanRequest {
  readonly script: VideoScript;
  readonly format: Format;
  readonly sources: Sources;
}

export const planTimeline = ({ script, format, sources }: PlanRequest): Effect.Effect<Timeline> =>
  Effect.forEach(cutsIn(script, format), (cut) => timeCut(script, cut, sources), {
    concurrency: "unbounded",
  }).pipe(
    Effect.map((timed) => {
      const cuts = place(timed);
      const total = totalOf(cuts);
      return {
        format,
        fps: FPS,
        width: FRAMES[format].width,
        height: FRAMES[format].height,
        durationInFrames: Math.max(total, ONE),
        cuts,
        bgm: bgmOf(script, sources),
        sfx: pipe(
          SFX,
          Rec.map(({ url }) => sources.assetSrc(url)),
        ),
        credits: creditsOf(script, sources),
        tachie: sources.tachie,
        images: pipe(
          Option.getOrElse(Option.fromNullishOr(script.images), () => NO_IMAGES),
          Rec.map((url) => sources.assetSrc(url)),
        ),
        portraits: sources.portraits,
      };
    }),
  );
