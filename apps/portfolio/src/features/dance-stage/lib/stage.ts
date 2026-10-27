import { Array as Arr, Effect, Option, pipe } from "effect";

import type { DanceEffect } from "#/features/dance-stage/model/effect";
import type { DanceTrack } from "#/features/dance-stage/model/track";

import type { Fn } from "./fn";
import { drawGlyphs } from "./glyphs";
import type { Glyphs } from "./glyphs";
import { BANDS, createRenderer, emptyBands, emptyPose, POSE_FIELDS, POSE_POINTS } from "./renderer";
import type { Frame, Renderer } from "./renderer";

const DANCE_SRC = "/seikin-techniques/dance.mp4";
const HISTORY_SRC = "/seikin-techniques/history.jpg";
const HISTORY_USES = /\b(?:history|historyTile|pastRgb|pastMatte)\b/u;
const HORIZONTAL = 0;
const VERTICAL = 1;
const DEPTH = 2;
const VISIBILITY = 3;
const FIELDS = [HORIZONTAL, VERTICAL, DEPTH, VISIBILITY];
const MISSING = 0;
const FIRST_FRAME = 0;
const LAST_OFFSET = 1;
const LEVEL = 0;
const FIRST_BAND = 1;
const NO_BEAT = 1000;

type Point = DanceTrack["frames"][number][number];

const valuesOf: Fn<Point, readonly number[]> = (point) =>
  pipe(
    FIELDS,
    Arr.map((field) =>
      pipe(
        Arr.get(point, field),
        Option.getOrElse(() => MISSING),
      ),
    ),
  );

const poseAt: Fn<Readonly<{ track: DanceTrack; frame: number }>, Float32Array> = ({
  track,
  frame,
}) => {
  const values = emptyPose();
  const points = pipe(
    Arr.get(track.frames, frame),
    Option.getOrElse((): DanceTrack["frames"][number] => []),
    Arr.take(POSE_POINTS),
  );
  for (const [index, point] of points.entries()) {
    values.set(valuesOf(point), index * POSE_FIELDS);
  }
  return values;
};

const audioAt: Fn<
  Readonly<{ track: DanceTrack; frame: number }>,
  Readonly<{ level: number; bands: Float32Array }>
> = ({ track, frame }) => {
  const row = pipe(
    Arr.get(track.audio, frame),
    Option.getOrElse((): readonly number[] => []),
  );
  const bands = emptyBands();
  bands.set(pipe(row, Arr.drop(FIRST_BAND), Arr.take(BANDS)));
  return {
    level: pipe(
      Arr.get(row, LEVEL),
      Option.getOrElse(() => MISSING),
    ),
    bands,
  };
};

const beatAt: Fn<
  Readonly<{ track: DanceTrack; time: number }>,
  Readonly<{ beat: number; beatCount: number }>
> = ({ track, time }) => {
  const passed = pipe(
    track.beats,
    Arr.filter((beat) => beat <= time),
  );
  return {
    beat: pipe(
      Arr.last(passed),
      Option.map((last) => time - last),
      Option.getOrElse(() => NO_BEAT),
    ),
    beatCount: passed.length,
  };
};

const frameOf: Fn<Readonly<{ video: HTMLVideoElement; track: DanceTrack }>, Frame> = ({
  video,
  track,
}) => {
  const time = video.currentTime;
  const frame = Math.min(
    Math.floor(time * track.fps),
    Math.max(track.frames.length - LAST_OFFSET, FIRST_FRAME),
  );
  return {
    time,
    frame,
    pose: poseAt({ track, frame }),
    ...audioAt({ track, frame }),
    ...beatAt({ track, time }),
  };
};

const createVideo = (): HTMLVideoElement => {
  const video = document.createElement("video");
  video.src = DANCE_SRC;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  return video;
};

const loadHistory: Fn<Readonly<{ renderer: Renderer; effect: DanceEffect }>, void> = ({
  renderer,
  effect,
}) => {
  if (
    pipe(
      effect.passes,
      Arr.some(({ frag }) => HISTORY_USES.test(frag)),
    )
  ) {
    const image = new Image();
    image.addEventListener("load", () => {
      renderer.upload({ asset: "history", source: image });
    });
    image.src = HISTORY_SRC;
  }
};

const loadGlyphs: Fn<Readonly<{ renderer: Renderer; effect: DanceEffect }>, void> = ({
  renderer,
  effect,
}) => {
  if (Arr.isReadonlyArrayNonEmpty(effect.texts)) {
    const apply: Fn<Glyphs, void> = ({ canvas, widths }) => {
      renderer.upload({ asset: "glyphs", source: canvas });
      renderer.setTextWidths(widths);
    };
    const glyphs = Effect.promise(() => document.fonts.ready).pipe(
      Effect.map(() => drawGlyphs(effect.texts)),
    );
    const applied = glyphs.pipe(Effect.map(Option.map(apply)));
    Effect.runFork(applied);
  }
};

const startStage: Fn<
  Readonly<{ canvas: HTMLCanvasElement; effect: DanceEffect; track: DanceTrack }>,
  () => void
> = ({ canvas, effect, track }) => {
  const renderer = createRenderer({ canvas, passes: effect.passes });
  const video = createVideo();
  const loop = { request: FIRST_FRAME };
  loadHistory({ renderer, effect });
  loadGlyphs({ renderer, effect });
  const render = (): void => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      renderer.draw({ video, frame: frameOf({ video, track }) });
    }
    loop.request = requestAnimationFrame(render);
  };
  loop.request = requestAnimationFrame(render);
  return () => {
    cancelAnimationFrame(loop.request);
    video.pause();
    video.removeAttribute("src");
    renderer.dispose();
  };
};

export { startStage };
