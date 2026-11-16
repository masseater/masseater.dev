import { Array as Arr, pipe } from "effect";

import type { Bus } from "./bus.ts";

const FULL_SCALE = 32_767;
const HALF = 0.5;
const BLOCK = 1024;
const GAP = 6;
const MONO = 1;
const STEREO = 2;
const FIELDS = 4;
const AT = { start: 0, length: 1, offset: 2, channels: 3 } as const;
const ONE = 1;
const FIRST = 0;
const SILENT = 0;

export interface Stem {
  readonly frames: number;
  readonly scale: number;
  readonly segments: Int32Array<ArrayBuffer>;
  readonly data: Int16Array<ArrayBuffer>;
}

interface Segment {
  readonly start: number;
  readonly end: number;
  readonly channels: number;
}

const peakOf = ({ left, right }: Bus): number => {
  let peak = SILENT;
  for (let index = FIRST; index < left.length; index += ONE) {
    peak = Math.max(peak, Math.abs(left[index] ?? SILENT), Math.abs(right[index] ?? SILENT));
  }
  return peak;
};

const loud = (value: number, threshold: number): boolean =>
  value >= threshold || value <= -threshold;

const heardIn = (
  { left, right }: Bus,
  [from, to, threshold]: readonly [number, number, number],
): boolean => {
  for (let index = from; index < to; index += ONE) {
    if (loud(left[index] ?? SILENT, threshold) || loud(right[index] ?? SILENT, threshold)) {
      return true;
    }
  }
  return false;
};

const blocksOf = (bus: Bus, threshold: number): readonly (readonly [number, number])[] => {
  const frames = bus.left.length;
  const heard: (readonly [number, number])[] = [];
  for (let from = FIRST; from < frames; from += BLOCK) {
    const to = Math.min(frames, from + BLOCK);
    if (heardIn(bus, [from, to, threshold])) {
      heard.push([from, to]);
    }
  }
  return heard;
};

const merged = (
  blocks: readonly (readonly [number, number])[],
): readonly (readonly [number, number])[] => {
  const starts: number[] = [];
  const ends: number[] = [];
  for (const [from, to] of blocks) {
    const last = ends.length - ONE;
    if (last >= FIRST && from <= (ends[last] ?? SILENT) + GAP * BLOCK) {
      ends[last] = to;
    } else {
      starts.push(from);
      ends.push(to);
    }
  }
  return Arr.zip(starts, ends);
};

const wide = (
  { left, right }: Bus,
  [start, end]: readonly [number, number],
  threshold: number,
): boolean => {
  for (let index = start; index < end; index += ONE) {
    if (loud((left[index] ?? SILENT) - (right[index] ?? SILENT), threshold)) {
      return true;
    }
  }
  return false;
};

const channelsOf = (bus: Bus, range: readonly [number, number], threshold: number): number => {
  if (wide(bus, range, threshold)) {
    return STEREO;
  }
  return MONO;
};

const segmentsOf = (bus: Bus, threshold: number): readonly Segment[] =>
  pipe(
    merged(blocksOf(bus, threshold)),
    Arr.map(([start, end]) => ({ start, end, channels: channelsOf(bus, [start, end], threshold) })),
  );

const sampleAt = (value: number, quantum: number): number => Math.floor(value * quantum + HALF);

const written = (
  { left, right }: Bus,
  { data, quantum }: Readonly<{ data: Int16Array; quantum: number }>,
  [segment, offset]: readonly [Segment, number],
): number => {
  let at = offset;
  for (let index = segment.start; index < segment.end; index += ONE) {
    const leftValue = left[index] ?? SILENT;
    const rightValue = right[index] ?? SILENT;
    if (segment.channels === STEREO) {
      data[at] = sampleAt(leftValue, quantum);
      data[at + ONE] = sampleAt(rightValue, quantum);
    } else {
      data[at] = sampleAt(leftValue + rightValue, quantum * HALF);
    }
    at += segment.channels;
  }
  return at;
};

const sizeOf = (found: readonly Segment[]): number => {
  let total = SILENT;
  for (const segment of found) {
    total += (segment.end - segment.start) * segment.channels;
  }
  return total;
};

const filled = (bus: Bus, found: readonly Segment[], quantum: number): Stem => {
  const data = new Int16Array(sizeOf(found));
  const segments = new Int32Array(found.length * FIELDS);
  let offset = SILENT;
  for (const [index, segment] of found.entries()) {
    segments.set(
      [segment.start, segment.end - segment.start, offset, segment.channels],
      index * FIELDS,
    );
    offset = written(bus, { data, quantum }, [segment, offset]);
  }
  return { frames: bus.left.length, scale: ONE / quantum, segments, data };
};

export const packed = (bus: Bus): Stem => {
  const peak = peakOf(bus);
  if (peak === SILENT) {
    return {
      frames: bus.left.length,
      scale: SILENT,
      segments: new Int32Array(),
      data: new Int16Array(),
    };
  }
  const quantum = FULL_SCALE / peak;
  return filled(bus, segmentsOf(bus, HALF / quantum), quantum);
};

export interface Unpacked {
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
}

interface Reading {
  readonly start: number;
  readonly length: number;
  readonly read: number;
}

const monoRead = (stem: Stem, out: Unpacked, { start, length, read }: Reading): void => {
  for (let index = FIRST; index < length; index += ONE) {
    const value = (stem.data[read + index] ?? SILENT) * stem.scale;
    out.left[start + index] = value;
    out.right[start + index] = value;
  }
};

const stereoRead = (stem: Stem, out: Unpacked, { start, length, read }: Reading): void => {
  for (let index = FIRST; index < length; index += ONE) {
    out.left[start + index] = (stem.data[read + index * STEREO] ?? SILENT) * stem.scale;
    out.right[start + index] = (stem.data[read + index * STEREO + ONE] ?? SILENT) * stem.scale;
  }
};

const unpackedSegment = (stem: Stem, out: Unpacked, at: number): void => {
  const reading = {
    start: stem.segments[at + AT.start] ?? SILENT,
    length: stem.segments[at + AT.length] ?? SILENT,
    read: stem.segments[at + AT.offset] ?? SILENT,
  };
  if (stem.segments[at + AT.channels] === STEREO) {
    stereoRead(stem, out, reading);
    return;
  }
  monoRead(stem, out, reading);
};

export const unpacked = (stem: Stem): Unpacked => {
  const out = { left: new Float32Array(stem.frames), right: new Float32Array(stem.frames) };
  for (let at = FIRST; at < stem.segments.length; at += FIELDS) {
    unpackedSegment(stem, out, at);
  }
  return out;
};
