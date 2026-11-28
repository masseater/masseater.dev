import { Array as Arr, Schema, pipe } from "effect";

export const ReceivedInputSchema = Schema.Struct({
  type: Schema.String,
  target: Schema.String,
  deltaY: Schema.Finite,
  ctrlKey: Schema.Boolean,
  firedAt: Schema.Finite,
  handledAt: Schema.Finite,
});

export type ReceivedInput = typeof ReceivedInputSchema.Type;

export const PerformanceRecordSchema = Schema.Struct({
  entryType: Schema.String,
  name: Schema.String,
  startTime: Schema.Finite,
  duration: Schema.Finite,
  blockingDuration: Schema.optionalKey(Schema.Finite),
  interactionId: Schema.optionalKey(Schema.Finite),
});

export type PerformanceRecord = typeof PerformanceRecordSchema.Type;

export const CommitSchema = Schema.Struct({ at: Schema.Finite, viewBox: Schema.String });

export const RecordingSchema = Schema.Struct({
  inputs: Schema.Array(ReceivedInputSchema),
  frames: Schema.Array(Schema.Finite),
  entries: Schema.Array(PerformanceRecordSchema),
  commits: Schema.Array(CommitSchema),
});

export type Recording = typeof RecordingSchema.Type;

export const PageSnapshotSchema = Schema.Struct({
  recording: RecordingSchema,
  now: Schema.Finite,
  viewBox: Schema.String,
  devicePixelRatio: Schema.Finite,
});

export type PageSnapshot = typeof PageSnapshotSchema.Type;

export const recordedSince = ({
  recording,
  since,
}: Readonly<{ recording: Recording; since: number }>): Recording => ({
  inputs: pipe(
    recording.inputs,
    Arr.filter((input) => input.handledAt >= since),
  ),
  frames: pipe(
    recording.frames,
    Arr.filter((time) => time >= since),
  ),
  entries: pipe(
    recording.entries,
    Arr.filter((entry) => entry.startTime >= since),
  ),
  commits: pipe(
    recording.commits,
    Arr.filter((commit) => commit.at >= since),
  ),
});
