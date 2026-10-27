import { Array as Arr, Option, pipe } from "effect";

import type { Pass } from "#/features/dance-stage/model/effect";
import type { PoseTrack } from "#/features/dance-stage/model/pose";

import type { Fn } from "./fn";
import { createRenderer, emptyPose, POSE_FIELDS, POSE_POINTS } from "./renderer";

const DANCE_SRC = "/seikin-techniques/dance.mp4";
const HORIZONTAL = 0;
const VERTICAL = 1;
const VISIBILITY = 3;
const FIELDS = [HORIZONTAL, VERTICAL, VISIBILITY];
const MISSING = 0;
const FIRST_FRAME = 0;
const LAST_OFFSET = 1;

type Point = PoseTrack["frames"][number][number];

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

const poseAt: Fn<Readonly<{ track: PoseTrack; frame: number }>, Float32Array> = ({
  track,
  frame,
}) => {
  const values = emptyPose();
  const points = pipe(
    Arr.get(track.frames, frame),
    Option.getOrElse((): PoseTrack["frames"][number] => []),
    Arr.take(POSE_POINTS),
  );
  for (const [index, point] of points.entries()) {
    values.set(valuesOf(point), index * POSE_FIELDS);
  }
  return values;
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

const frameOf: Fn<Readonly<{ video: HTMLVideoElement; track: PoseTrack }>, number> = ({
  video,
  track,
}) =>
  Math.min(
    Math.floor(video.currentTime * track.fps),
    Math.max(track.frames.length - LAST_OFFSET, FIRST_FRAME),
  );

const startStage: Fn<
  Readonly<{ canvas: HTMLCanvasElement; passes: readonly Pass[]; track: PoseTrack }>,
  () => void
> = ({ canvas, passes, track }) => {
  const renderer = createRenderer({ canvas, passes });
  const video = createVideo();
  const loop = { request: FIRST_FRAME };
  const render = (): void => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const frame = frameOf({ video, track });
      renderer.draw({
        video,
        frame: { time: video.currentTime, frame, pose: poseAt({ track, frame }) },
      });
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
