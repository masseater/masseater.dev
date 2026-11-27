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

export interface Level {
  readonly decibels: number;
  readonly pan: number;
  readonly muted: boolean;
}

export interface TrackSend {
  readonly bus: number;
  readonly amount: number;
}

export type MixParameter = "volume" | "pan";

export interface MixPoint extends Timed {
  readonly value: number;
}

export interface Envelope {
  readonly parameter: MixParameter;
  readonly points: readonly MixPoint[];
}

export interface TrackMix {
  readonly level: Level;
  readonly sends: readonly TrackSend[];
  readonly envelopes: readonly Envelope[];
}

export interface BusMix {
  readonly name: Option.Option<string>;
  readonly level: Level;
}

export interface Mix {
  readonly tracks: ReadonlyMap<number, TrackMix>;
  readonly buses: readonly BusMix[];
}

export const NO_MIX: Mix = { tracks: new Map(), buses: [] };

export interface Timeline {
  readonly title: Option.Option<string>;
  readonly end: number;
  readonly offGrid: number;
  readonly tempos: readonly TempoChange[];
  readonly meters: readonly Meter[];
  readonly markers: readonly Text[];
  readonly parts: readonly Part[];
  readonly mix: Mix;
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
