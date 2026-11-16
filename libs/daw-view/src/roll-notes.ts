import { Array as Arr, Option, String as Str, pipe } from "effect";

import { sampleColor, trackColor } from "./color.ts";
import { clamp } from "./math.ts";
import { fontOf, leftOf } from "./pen.ts";
import type { Roll } from "./roll-grid.ts";
import { centerOf, glideAt, glides, isKeyed, rowIndex } from "./roll-layout.ts";
import type { Keys } from "./roll-layout.ts";
import { barSeconds } from "./song.ts";
import type { GlidePoint, Note, NoteEvent } from "./song.ts";
import { noteName } from "./text.ts";
import { eventsBetween, levelOf } from "./tracks.ts";
import type { Track } from "./tracks.ts";

const WIDTH = { least: 2, gap: 1 } as const;
const GAIN = { floor: 0.42, range: 0.5 } as const;
const BAR = { least: 2, keyTrim: 1, rowTrim: 1.5, rowInset: 0.75 } as const;
const OUTLINE = { inset: 0.5, trim: 1 } as const;
const NAME = {
  height: 5.5,
  width: 22,
  grow: 1.5,
  least: 7,
  most: 9,
  pad: 3,
  fit: 5,
  nudge: 0.5,
} as const;
const TOLERANCE = 1e-6;
const TWO = 2;
const OPAQUE = 1;

export interface Notes extends Roll {
  readonly time: number;
  readonly hover: Option.Option<NoteEvent>;
}

interface Brush extends Notes {
  readonly track: Track;
  readonly colorOf: (event: NoteEvent) => string;
  readonly level: number;
}

interface Box {
  readonly left: number;
  readonly width: number;
  readonly on: boolean;
}

interface Slot extends Box {
  readonly top: number;
  readonly height: number;
}

const sampleColors = ({ pen }: Notes, track: Track): ((event: NoteEvent) => string) => {
  const tint = sampleColor(pen.theme.tint);
  const colors = new Map(
    pipe(
      track.samples,
      Arr.map((sample, index) => [sample.name, tint({ hue: track.hue, index })] as const),
    ),
  );
  return (event) => colors.get(event.sample) ?? pen.theme.ink;
};

const brushOf =
  (notes: Notes) =>
  (track: Track): Brush => {
    const base = trackColor(notes.pen.theme.tint)(track);
    const level = levelOf(track);
    if (notes.layout.single) {
      return { ...notes, track, level, colorOf: sampleColors(notes, track) };
    }
    return { ...notes, track, level, colorOf: () => base };
  };

const boxOf = ({ pen, time }: Brush, event: NoteEvent): Box => {
  const bar = barSeconds(pen.structure);
  return {
    left: leftOf(pen)(event.start / bar),
    width: Math.max(WIDTH.least, (event.duration / bar) * pen.scale - WIDTH.gap),
    on: time >= event.start && time < event.start + event.duration,
  };
};

const ink = (brush: Brush, event: NoteEvent, box: Box): void => {
  const { context } = brush.pen;
  context.fillStyle = brush.colorOf(event);
  context.globalAlpha =
    (GAIN.floor + GAIN.range * Math.sqrt(event.gain / brush.track.loudest)) * brush.level;
  if (box.on) {
    context.globalAlpha = brush.level;
  }
};

const hovered = (brush: Brush, event: NoteEvent): boolean =>
  Option.isSome(brush.hover) && brush.hover.value === event;

const outline = (brush: Brush, event: NoteEvent, slot: Slot): void => {
  const { context, theme } = brush.pen;
  if (slot.on || hovered(brush, event)) {
    context.globalAlpha = brush.level;
    context.strokeStyle = theme.ink;
    context.lineWidth = OUTLINE.trim;
    context.strokeRect(
      slot.left + OUTLINE.inset,
      slot.top + OUTLINE.inset,
      slot.width - OUTLINE.trim,
      slot.height - OUTLINE.trim,
    );
  }
};

const roomy = (slot: Slot): boolean => slot.height >= NAME.height && slot.width >= NAME.width;

const write = ({ pen, level }: Brush, slot: Slot, text: string): boolean => {
  pen.context.font = fontOf(pen)(
    clamp({ low: NAME.least, high: NAME.most })(slot.height + NAME.grow),
  );
  if (text === "" || pen.context.measureText(text).width > slot.width - NAME.fit) {
    return false;
  }
  pen.context.globalAlpha = level;
  pen.context.fillStyle = pen.theme.card;
  pen.context.fillText(text, slot.left + NAME.pad, slot.top + slot.height / TWO + NAME.nudge);
  return true;
};

const arrow = (event: NoteEvent, text: string): string => {
  if (event.reversed) {
    return `← ${text}`;
  }
  return text;
};

const trail =
  ({ pen }: Brush, note: Note, keys: Keys) =>
  (points: readonly GlidePoint[], offset: number): void => {
    const bar = barSeconds(pen.structure);
    for (const point of points) {
      const top = centerOf(keys)(note.pitch + point.semitones) + offset;
      pen.context.lineTo(leftOf(pen)((note.start + point.at) / bar), top);
    }
  };

const bend = (brush: Brush, note: Note, keys: Keys): void => {
  const { context } = brush.pen;
  const half = Math.max(BAR.least, keys.row - BAR.keyTrim) / TWO;
  const points = pipe(
    note.glide,
    Arr.filter((point) => point.at <= note.duration + TOLERANCE),
  );
  context.beginPath();
  trail(brush, note, keys)(points, -half);
  trail(brush, note, keys)(Arr.reverse(points), half);
  context.closePath();
  context.fill();
};

const keySlot = (brush: Brush, note: Note, keys: Keys): Slot => {
  const height = Math.max(BAR.least, keys.row - BAR.keyTrim);
  const rest = note.pitch + glideAt(note)(note.duration);
  return { ...boxOf(brush, note), top: centerOf(keys)(rest) - height / TWO, height };
};

const keyed =
  (brush: Brush, keys: Keys) =>
  (note: Note): void => {
    const slot = keySlot(brush, note, keys);
    ink(brush, note, slot);
    if (glides(note)) {
      bend(brush, note, keys);
    } else {
      brush.pen.context.fillRect(slot.left, slot.top, slot.width, slot.height);
    }
    outline(brush, note, slot);
    if (roomy(slot)) {
      write(brush, slot, arrow(note, note.sample));
    }
  };

const visible = (brush: Brush): readonly NoteEvent[] => {
  const bar = barSeconds(brush.pen.structure);
  return eventsBetween({ from: brush.pen.from * bar, to: brush.pen.to * bar })(brush.track);
};

const keyedTrack =
  (notes: Notes, keys: Keys) =>
  (track: Track): void => {
    const brush = brushOf(notes)(track);
    pipe(visible(brush), Arr.filter(isKeyed(notes.layout)), Arr.map(keyed(brush, keys)));
  };

const keyedPass = (notes: Notes, keys: Keys): void => {
  const { pen, layout } = notes;
  pen.context.save();
  pen.context.beginPath();
  pen.context.rect(pen.origin, layout.top, pen.width - pen.origin, keys.height);
  pen.context.clip();
  pipe(layout.tracks, Arr.map(keyedTrack(notes, keys)));
  pen.context.restore();
};

const rowText = (brush: Brush, event: NoteEvent): string => {
  if (!brush.layout.single) {
    return event.sample;
  }
  if (event.kind === "note") {
    return noteName(event.pitch);
  }
  return pipe(arrow(event, ""), Str.trim);
};

interface Spacer {
  readonly free: (index: number, left: number) => boolean;
  readonly take: (index: number, right: number) => void;
}

const spacer = (): Spacer => {
  const taken = new Map<number, number>();
  return {
    free: (index, left) => left >= (taken.get(index) ?? Number.NEGATIVE_INFINITY),
    take: (index, right) => {
      taken.set(index, right);
    },
  };
};

const rowSlot = (brush: Brush, event: NoteEvent, index: number): Slot => ({
  ...boxOf(brush, event),
  top: brush.layout.rowsTop + index * brush.layout.rowHeight + BAR.rowInset,
  height: Math.max(BAR.least, brush.layout.rowHeight - BAR.rowTrim),
});

const rowName = (
  brush: Brush,
  space: Spacer,
  mark: Readonly<{ slot: Slot; index: number; text: string }>,
): void => {
  const { slot, index, text } = mark;
  if (roomy(slot) && space.free(index, slot.left) && write(brush, slot, text)) {
    space.take(index, slot.left + slot.width);
  }
};

const rowed =
  (brush: Brush, space: Spacer) =>
  (event: NoteEvent): void => {
    const index = rowIndex(brush.layout)(event);
    if (Option.isSome(index)) {
      const slot = rowSlot(brush, event, index.value);
      ink(brush, event, slot);
      brush.pen.context.fillRect(slot.left, slot.top, slot.width, slot.height);
      outline(brush, event, slot);
      rowName(brush, space, { slot, index: index.value, text: rowText(brush, event) });
    }
  };

const rowPass = (notes: Notes): void => {
  const space = spacer();
  for (const track of notes.layout.tracks) {
    const brush = brushOf(notes)(track);
    pipe(
      visible(brush),
      Arr.filter((event) => !isKeyed(notes.layout)(event)),
      Arr.map(rowed(brush, space)),
    );
  }
};

export const notes = (frame: Notes): void => {
  if (Option.isSome(frame.layout.keys)) {
    keyedPass(frame, frame.layout.keys.value);
  }
  rowPass(frame);
  frame.pen.context.globalAlpha = OPAQUE;
};
