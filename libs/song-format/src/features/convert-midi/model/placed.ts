import type { MidiEvent } from "midi-file";

export type ChannelEvent = Extract<MidiEvent, { readonly channel: number }>;

export interface PlacedEvent {
  readonly tick: number;
  readonly event: ChannelEvent;
}
