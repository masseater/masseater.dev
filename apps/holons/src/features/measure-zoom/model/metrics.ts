import { Array as Arr, Number as Num, Option, pipe } from "effect";

import type { PerformanceRecord, Recording } from "./recording.ts";
import { expectedZoom, zoomInputsOf, zoomOf } from "./zoom.ts";
import type { ZoomInput } from "./zoom.ts";

const MEDIAN = 0.5;
const P90 = 0.9;
const DIGITS = 3;
const NOTHING = 0;
const NEXT = 1;
const LONG_ANIMATION_FRAME = "long-animation-frame";
const LONG_TASK = "longtask";
const EVENT = "event";

export type Frames = Readonly<{
  frameIntervalsMs: readonly number[];
  frameMedianMs: number;
  frameP90Ms: number;
  frameMaxMs: number;
  frames: number;
  commitFrameMs: number;
  commits: number;
}>;

export type MainThread = Readonly<{
  longTasks: number;
  longTaskMs: number;
  longAnimationFrames: number;
  longAnimationFrameMaxMs: number;
  blockingMs: number;
  interactionMaxMs: number;
  inputDelayMaxMs: number;
}>;

export type Wheels = Readonly<{
  wheelsSent: number;
  wheelsReceived: number;
  deltaYSent: number;
  deltaYReceived: number;
}>;

export type Zoom = Readonly<{
  zoom: number;
  zoomExpected: number;
  zoomFromReceived: number;
  zoomRatio: number;
}>;

export type Measurement = Frames &
  MainThread &
  Wheels &
  Zoom &
  Readonly<{ devicePixelRatio: number }>;

const indexAt = (length: number, fraction: number): number =>
  Math.min(length - NEXT, Math.floor(length * fraction));

export const quantile = ({
  values,
  fraction,
}: Readonly<{ values: readonly number[]; fraction: number }>): number =>
  pipe(
    values,
    Arr.sortWith((value) => value, Num.Order),
    (sorted) => pipe(sorted, Arr.get(indexAt(sorted.length, fraction))),
    Option.getOrElse(() => NOTHING),
  );

const round = (value: number): number => Number(value.toFixed(DIGITS));

const maxOf = (values: readonly number[]): number => Math.max(NOTHING, ...values);

const ofType =
  (entryType: string) =>
  (entries: readonly PerformanceRecord[]): readonly PerformanceRecord[] =>
    pipe(
      entries,
      Arr.filter((entry) => entry.entryType === entryType),
    );

const durations = (entries: readonly PerformanceRecord[]): readonly number[] =>
  pipe(
    entries,
    Arr.map((entry) => entry.duration),
  );

const intervalsOf = (frames: readonly number[]): readonly number[] =>
  pipe(
    Arr.zip(frames, Arr.drop(frames, NEXT)),
    Arr.map(([earlier, later]) => later - earlier),
  );

const lastCommitOf = (recording: Recording): Option.Option<number> =>
  pipe(
    Arr.last(recording.commits),
    Option.map((commit) => commit.at),
  );

const commitFrameOf = (recording: Recording): Option.Option<PerformanceRecord> =>
  pipe(
    recording.entries,
    ofType(LONG_ANIMATION_FRAME),
    Arr.findFirst((entry) =>
      Option.exists(
        lastCommitOf(recording),
        (at) => entry.startTime <= at && at <= entry.startTime + entry.duration,
      ),
    ),
  );

const drawnAt = (recording: Recording): number =>
  pipe(
    commitFrameOf(recording),
    Option.map((entry) => entry.startTime + entry.duration),
    Option.orElse(() => lastCommitOf(recording)),
    Option.getOrElse(() => NOTHING),
  );

const intervalsUntilDrawn = (recording: Recording): readonly number[] => {
  const firstInput = pipe(
    Arr.head(recording.inputs),
    Option.map((input) => input.handledAt),
    Option.getOrElse(() => NOTHING),
  );
  const drawn = drawnAt(recording);
  const lastFrame = pipe(
    recording.frames,
    Arr.findFirst((time) => time >= drawn),
    Option.getOrElse(() => drawn),
  );
  return pipe(
    recording.frames,
    Arr.filter((time) => time >= firstInput && time <= lastFrame),
    intervalsOf,
  );
};

export const framesOf = (recording: Recording): Frames => {
  const intervals = intervalsUntilDrawn(recording);
  return {
    frameIntervalsMs: pipe(intervals, Arr.map(round)),
    frameMedianMs: round(quantile({ values: intervals, fraction: MEDIAN })),
    frameP90Ms: round(quantile({ values: intervals, fraction: P90 })),
    frameMaxMs: round(maxOf(intervals)),
    frames: intervals.length,
    commitFrameMs: pipe(
      commitFrameOf(recording),
      Option.map((entry) => round(entry.duration)),
      Option.getOrElse(() => NOTHING),
    ),
    commits: recording.commits.length,
  };
};

const blockingOf = (entries: readonly PerformanceRecord[]): number =>
  pipe(
    entries,
    Arr.map((entry) =>
      pipe(
        Option.fromNullishOr(entry.blockingDuration),
        Option.getOrElse(() => NOTHING),
      ),
    ),
    Num.sumAll,
  );

const isInteraction = (entry: PerformanceRecord): boolean =>
  pipe(
    Option.fromNullishOr(entry.interactionId),
    Option.exists((id) => id > NOTHING),
  );

const inputDelaysOf = (recording: Recording): readonly number[] =>
  pipe(
    recording.inputs,
    Arr.map((input) => input.handledAt - input.firedAt),
  );

export const mainThreadOf = (recording: Recording): MainThread => {
  const animationFrames = ofType(LONG_ANIMATION_FRAME)(recording.entries);
  const longTasks = ofType(LONG_TASK)(recording.entries);
  const interactions = pipe(recording.entries, ofType(EVENT), Arr.filter(isInteraction));
  return {
    longTasks: longTasks.length,
    longTaskMs: round(Num.sumAll(durations(longTasks))),
    longAnimationFrames: animationFrames.length,
    longAnimationFrameMaxMs: round(maxOf(durations(animationFrames))),
    blockingMs: round(blockingOf(animationFrames)),
    interactionMaxMs: round(maxOf(durations(interactions))),
    inputDelayMaxMs: round(maxOf(inputDelaysOf(recording))),
  };
};

const deltasOf = (inputs: readonly ZoomInput[]): readonly number[] =>
  pipe(
    inputs,
    Arr.flatMap((input) => {
      if (input.kind === "wheel") {
        return [input.deltaY];
      }
      return [];
    }),
  );

export type Measured = Readonly<{
  devicePixelRatio: number;
  recording: Recording;
  viewBox: string;
  sent: readonly ZoomInput[];
  fullWidth: number;
}>;

export const wheelsOf = ({ recording, sent }: Measured): Wheels => {
  const received = deltasOf(zoomInputsOf(recording.inputs));
  const asked = deltasOf(sent);
  return {
    wheelsSent: asked.length,
    wheelsReceived: received.length,
    deltaYSent: round(Num.sumAll(asked)),
    deltaYReceived: round(Num.sumAll(received)),
  };
};

export const zoomMeasuredOf = ({ recording, viewBox, sent, fullWidth }: Measured): Zoom => {
  const zoom = pipe(
    zoomOf({ viewBox, fullWidth }),
    Option.getOrElse(() => NOTHING),
  );
  const zoomExpected = expectedZoom({ inputs: sent, fullWidth });
  return {
    zoom: round(zoom),
    zoomExpected: round(zoomExpected),
    zoomFromReceived: round(expectedZoom({ inputs: zoomInputsOf(recording.inputs), fullWidth })),
    zoomRatio: round(zoom / zoomExpected),
  };
};

export const measurementOf = (measured: Measured): Measurement => ({
  ...framesOf(measured.recording),
  ...mainThreadOf(measured.recording),
  ...wheelsOf(measured),
  ...zoomMeasuredOf(measured),
  devicePixelRatio: measured.devicePixelRatio,
});

export type Summary = Readonly<{
  frameMedianMs: number;
  frameP90Ms: number;
  frameMaxMs: number;
  commitFrameMs: number;
  longAnimationFrameMaxMs: number;
  blockingMs: number;
  interactionMaxMs: number;
  inputDelayMaxMs: number;
  wheelsReceived: number;
  deltaYReceived: number;
  zoom: number;
  zoomExpected: number;
  zoomRatio: number;
}>;

const medianOf =
  (runs: readonly Measurement[]) =>
  (pick: (measurement: Measurement) => number): number => {
    const values = pipe(runs, Arr.map(pick));
    return round(quantile({ values, fraction: MEDIAN }));
  };

export const summarize = (runs: readonly Measurement[]): Summary => {
  const median = medianOf(runs);
  return {
    frameMedianMs: median((run) => run.frameMedianMs),
    frameP90Ms: median((run) => run.frameP90Ms),
    frameMaxMs: median((run) => run.frameMaxMs),
    commitFrameMs: median((run) => run.commitFrameMs),
    longAnimationFrameMaxMs: median((run) => run.longAnimationFrameMaxMs),
    blockingMs: median((run) => run.blockingMs),
    interactionMaxMs: median((run) => run.interactionMaxMs),
    inputDelayMaxMs: median((run) => run.inputDelayMaxMs),
    wheelsReceived: median((run) => run.wheelsReceived),
    deltaYReceived: median((run) => run.deltaYReceived),
    zoom: median((run) => run.zoom),
    zoomExpected: median((run) => run.zoomExpected),
    zoomRatio: median((run) => run.zoomRatio),
  };
};
