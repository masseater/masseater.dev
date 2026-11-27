import type { Controller } from "@r_masseater/fumx-parser";
import { Array as Arr, Order } from "effect";
import type { Option } from "effect";

export interface Timed {
  readonly tick: number;
}

export interface TimelineNote extends Timed {
  readonly end: number;
  readonly midi: number;
  readonly velocity: number;
  readonly release: number;
}

export interface TimelineControl extends Timed {
  readonly controller: Controller;
  readonly value: number;
}

export interface Text extends Timed {
  readonly text: string;
}

export interface Part {
  readonly track: number;
  readonly channel: number;
  readonly name: Option.Option<string>;
  readonly program: Option.Option<number>;
  readonly notes: readonly TimelineNote[];
  readonly controls: readonly TimelineControl[];
  readonly lyrics: readonly Text[];
}

export interface Meter extends Timed {
  readonly numerator: number;
  readonly denominator: number;
}

export interface TempoChange extends Timed {
  readonly microseconds: number;
  readonly target: Option.Option<number>;
}

export interface Timeline {
  readonly title: Option.Option<string>;
  readonly end: number;
  readonly offGrid: number;
  readonly tempos: readonly TempoChange[];
  readonly meters: readonly Meter[];
  readonly markers: readonly Text[];
  readonly parts: readonly Part[];
}

const byTick = Order.mapInput(Order.Number, (timed: Timed) => timed.tick);

export const sortedByTick = <Item extends Timed>(items: readonly Item[]): readonly Item[] =>
  Arr.sort(items, byTick);

const byTickThenPitch = Order.combine(
  Order.mapInput(Order.Number, (note: TimelineNote) => note.tick),
  Order.mapInput(Order.Number, (note: TimelineNote) => note.midi),
);

export const sortedNotes = (notes: readonly TimelineNote[]): readonly TimelineNote[] =>
  Arr.sort(notes, byTickThenPitch);
