import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import type { Scene, Script } from "#/entities/script/index.ts";
import type { Format } from "#/shared/config/index.ts";
import { FPS, FRAMES, NOTHING, ONE, SFX, SFX_CREDIT, Timing } from "#/shared/config/index.ts";

import { cuesOf } from "./cues.ts";
import type { Unplaced } from "./fit-length.ts";
import { fitLength, totalOf } from "./fit-length.ts";
import { frames, revealsOf } from "./frames.ts";
import { timeLines } from "./lines.ts";
import type { Sources, TimedLine, TimedScene, Timeline } from "./timeline.ts";

const REVEAL_HOLD_SECONDS = 1.6;

const naturalLength = (
  scene: Scene,
  lines: readonly TimedLine[],
  reveals: readonly number[],
): number => {
  if ("fixedSeconds" in scene) {
    return frames(scene.fixedSeconds);
  }
  const shown = Option.match(Arr.last(reveals), {
    onNone: () => NOTHING,
    onSome: (last) => last + frames(REVEAL_HOLD_SECONDS),
  });
  const spoken = Option.match(Arr.last(lines), {
    onNone: () => frames(Timing.EMPTY_SCENE_SECONDS),
    onSome: ({ from, duration }) => from + duration + frames(Timing.SCENE_PADDING_SECONDS),
  });
  return Math.max(spoken, shown);
};

const timeScene = (script: Script, scene: Scene, sources: Sources): Effect.Effect<Unplaced> =>
  timeLines({ script, scene, sources }).pipe(
    Effect.map((lines) => {
      const reveals = revealsOf(scene);
      return { scene, lines, reveals, duration: naturalLength(scene, lines, reveals) };
    }),
  );

const NO_CREDITS: readonly string[] = [];

const bgmCreditOf = (script: Script): readonly string[] => {
  if ("bgm" in script) {
    return [`BGM:${script.bgm.credit}`];
  }
  return NO_CREDITS;
};

const creditsOf = (script: Script, sources: Sources): readonly string[] => [
  ...Option.match(sources.speakerName, {
    onNone: () => NO_CREDITS,
    onSome: (name) => [`VOICEVOX:${name}`],
  }),
  ...bgmCreditOf(script),
  `効果音:${SFX_CREDIT}`,
];

const place = (scenes: readonly Unplaced[]): readonly TimedScene[] =>
  pipe(
    scenes,
    Arr.mapAccum(NOTHING, (from, timed) => [from + timed.duration, { ...timed, from }]),
    ([, placed]) => placed,
  );

const bgmOf = (script: Script, sources: Sources): Option.Option<string> => {
  if ("bgm" in script) {
    return Option.some(sources.assetSrc(script.bgm.url));
  }
  return Option.none();
};

export interface PlanRequest {
  readonly script: Script;
  readonly format: Format;
  readonly sources: Sources;
}

export const planTimeline = ({ script, format, sources }: PlanRequest): Effect.Effect<Timeline> =>
  Effect.forEach(
    pipe(
      script.scenes,
      Arr.filter(({ formats }) => formats.includes(format)),
    ),
    (scene) => timeScene(script, scene, sources),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((planned) => {
      const scenes = place(fitLength({ scenes: planned, target: frames(script.length[format]) }));
      return {
        format,
        fps: FPS,
        width: FRAMES[format].width,
        height: FRAMES[format].height,
        durationInFrames: Math.max(totalOf(scenes), ONE),
        scenes,
        bgm: bgmOf(script, sources),
        cues: pipe(scenes, Arr.flatMap(cuesOf)),
        sfx: pipe(
          SFX,
          Rec.map(({ url }) => sources.assetSrc(url)),
        ),
        credits: creditsOf(script, sources),
      };
    }),
  );
