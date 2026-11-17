import type { Controller } from "@r_masseater/fumx-parser";
import { Array as Arr, Order } from "effect";
import type { Option } from "effect";
import type { MidiEvent } from "midi-file";

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

export type ChannelEvent = Extract<MidiEvent, { readonly channel: number }>;

export interface PlacedEvent {
  readonly tick: number;
  readonly event: ChannelEvent;
}

const byTick = Order.mapInput(Order.Number, (timed: Timed) => timed.tick);

export const sortedByTick = <Item extends Timed>(items: readonly Item[]): readonly Item[] =>
  Arr.sort(items, byTick);
