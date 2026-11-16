import { Array as Arr, Option, pipe } from "effect";

import type { Clip, NoteEvent, Lane, Track } from "#/entities/song/index.ts";
import {
  trackColor,
  STEPS_PER_BAR,
  barSeconds,
  normalized,
  eventsBetween,
} from "#/entities/song/index.ts";
import { clamp } from "#/shared/lib/math.ts";
import { fitted, fontOf, leftOf } from "#/widgets/daw-view/model/pen.ts";
import type { Pen } from "#/widgets/daw-view/model/pen.ts";

const CLIP = { inset: 2, gap: 1, title: 10, titled: 30, body: 0.14, head: 0.34 } as const;
const NAME = { least: 30, font: 8, pad: 3, nudge: 0.5 } as const;
const NOTE = { least: 1.5, most: 3, hit: 2, lift: 5, ghost: 1.5, rowGap: 0.6 } as const;
const GAIN = { floor: 0.5, range: 0.5 } as const;
const TIGHT = 40;
const BODY_TRIM = 5;
const CURVE = { inset: 4, stroke: 1.25, fill: 0.12, base: 2 } as const;
const NONE = 0;
const ONE = 1;
const TWO = 2;
const OPAQUE = 1;
const HAIRLINE = 1;

interface Row {
  readonly pen: Pen;
  readonly track: Track;
  readonly color: string;
  readonly title: number;
  readonly top: number;
  readonly body: number;
}

interface Band {
  readonly top: number;
  readonly height: number;
}

const titleOf = (track: Track): number => {
  if (track.height >= CLIP.titled) {
    return CLIP.title;
  }
  return NONE;
};

const rowOf = (pen: Pen, track: Track): Row => {
  const title = titleOf(track);
  return {
    pen,
    track,
    color: trackColor(pen.theme.tint)(track),
    title,
    top: track.top + CLIP.inset + title,
    body: track.height - BODY_TRIM - title,
  };
};

const clipName = ({ pen, track, title }: Row, item: Clip): void => {
  const start = leftOf(pen)(item.from) + CLIP.gap;
  const end = leftOf(pen)(item.to);
  if (end - start >= NAME.least) {
    const left = Math.max(start, NONE) + NAME.pad;
    pen.context.fillStyle = pen.theme.ink;
    pen.context.font = fontOf(pen)(NAME.font);
    pen.context.fillText(
      fitted(pen.context)(item.name, end - left - NAME.pad),
      left,
      track.top + CLIP.inset + title / TWO + NAME.nudge,
    );
  }
};

const fillClip = (row: Row, item: Clip, height: number): void => {
  const { pen, track } = row;
  const start = leftOf(pen)(item.from) + CLIP.gap;
  const width = (item.to - item.from) * pen.scale - CLIP.gap;
  pen.context.fillRect(start, track.top + CLIP.inset, width, height);
};

const clipHead = (row: Row, item: Clip): void => {
  row.pen.context.globalAlpha = CLIP.head;
  fillClip(row, item, row.title);
  row.pen.context.globalAlpha = OPAQUE;
  clipName(row, item);
};

const clip =
  (row: Row) =>
  (item: Clip): void => {
    const { pen, track } = row;
    pen.context.fillStyle = row.color;
    pen.context.globalAlpha = CLIP.body;
    fillClip(row, item, track.height - CLIP.inset * TWO);
    if (row.title > NONE) {
      clipHead(row, item);
    }
    pen.context.globalAlpha = OPAQUE;
  };

const inView =
  (pen: Pen) =>
  (item: Clip): boolean =>
    item.to >= pen.from && item.from <= pen.to;

const noteBand = ({ track, top, body }: Row, pitch: number): Band => {
  const span = Math.max(ONE, track.pitches.high - track.pitches.low);
  const height = clamp({ low: NOTE.least, high: NOTE.most })(body / (span + ONE));
  return { top: top + ((track.pitches.high - pitch) / span) * (body - height), height };
};

const hitBand = ({ track, top, body }: Row, sample: string): Band => {
  const height = body / Math.max(ONE, track.rows.length);
  const index = pipe(
    track.rows,
    Arr.findFirstIndex((row) => row === sample),
    Option.getOrElse(() => NONE),
  );
  return { top: top + index * height, height: Math.max(NOTE.least, height - NOTE.rowGap) };
};

const bandOf = (row: Row, event: NoteEvent): Band => {
  if (row.track.pitched && event.kind === "note") {
    return noteBand(row, event.pitch);
  }
  if (row.track.pitched) {
    return { top: row.track.top + row.track.height - NOTE.lift, height: NOTE.hit };
  }
  if (event.kind === "hit") {
    return hitBand(row, event.sample);
  }
  return { top: row.top, height: NOTE.ghost };
};

const gapOf = (scale: number): number => {
  if (scale > TIGHT) {
    return ONE;
  }
  return NONE;
};

const stroke =
  (row: Row) =>
  (event: NoteEvent): void => {
    const { pen, track } = row;
    const bar = barSeconds(pen.structure);
    const band = bandOf(row, event);
    const width = Math.max(ONE, (event.duration / bar) * pen.scale - gapOf(pen.scale));
    pen.context.globalAlpha = GAIN.floor + GAIN.range * Math.sqrt(event.gain / track.loudest);
    pen.context.fillRect(leftOf(pen)(event.start / bar), band.top, width, band.height);
  };

const track =
  (pen: Pen) =>
  (item: Track): void => {
    const row = rowOf(pen, item);
    const bar = barSeconds(pen.structure);
    pipe(item.clips, Arr.filter(inView(pen)), Arr.map(clip(row)));
    pen.context.fillStyle = row.color;
    pipe(item, eventsBetween({ from: pen.from * bar, to: pen.to * bar }), Arr.map(stroke(row)));
    pen.context.globalAlpha = OPAQUE;
    pen.context.fillStyle = pen.theme.line;
    pen.context.fillRect(NONE, item.top + item.height - HAIRLINE, pen.width, HAIRLINE);
  };

export const tracks =
  (pen: Pen) =>
  (items: readonly Track[]): void => {
    for (const item of items) {
      track(pen)(item);
    }
  };

const trace = (pen: Pen, lane: Lane): Readonly<{ first: number; last: number }> => {
  const { values } = lane.automation;
  const first = Math.max(NONE, pen.from * STEPS_PER_BAR);
  const last = Math.min(values.length - ONE, pen.to * STEPS_PER_BAR);
  const level = normalized(lane.automation);
  const floor = lane.top + lane.height - CURVE.inset;
  pen.context.beginPath();
  for (const index of Arr.range(first, last)) {
    const height = level(values[index] ?? NONE) * (lane.height - CURVE.inset * TWO);
    pen.context.lineTo(leftOf(pen)(index / STEPS_PER_BAR), floor - height);
  }
  return { first, last };
};

const fill = (pen: Pen, lane: Lane, ends: Readonly<{ first: number; last: number }>): void => {
  const base = lane.top + lane.height - CURVE.base;
  pen.context.lineTo(leftOf(pen)(ends.last / STEPS_PER_BAR), base);
  pen.context.lineTo(leftOf(pen)(ends.first / STEPS_PER_BAR), base);
  pen.context.closePath();
  pen.context.globalAlpha = CURVE.fill;
  pen.context.fillStyle = pen.theme.dim;
  pen.context.fill();
  pen.context.globalAlpha = OPAQUE;
};

const lane =
  (pen: Pen) =>
  (item: Lane): void => {
    const ends = trace(pen, item);
    pen.context.strokeStyle = pen.theme.dim;
    pen.context.lineWidth = CURVE.stroke;
    pen.context.stroke();
    fill(pen, item, ends);
    pen.context.fillStyle = pen.theme.line;
    pen.context.fillRect(NONE, item.top + item.height - HAIRLINE, pen.width, HAIRLINE);
  };

export const lanes =
  (pen: Pen) =>
  (items: readonly Lane[]): void => {
    for (const item of items) {
      lane(pen)(item);
    }
  };
