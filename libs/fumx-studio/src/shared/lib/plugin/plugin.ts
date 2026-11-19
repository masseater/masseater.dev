import type { LiveMix } from "@masseater.dev/daw-view";
import type { PluginArgument, Song } from "@r_masseater/fumx-parser";
import type { Effect, Option, Scope } from "effect";

import type { Lane } from "#/shared/lib/daw/view.ts";
import type { Bus } from "#/shared/lib/studio/bus.ts";
import type { Ledger, Placement } from "#/shared/lib/studio/placement.ts";

export type Samples = Readonly<Record<string, Float32Array>>;

export interface VoiceRequest {
  readonly pitch: Option.Option<number>;
  readonly args: readonly PluginArgument[];
  readonly samples: Samples;
}

export interface Voice {
  readonly sound: Float32Array;
  readonly label: string;
  readonly midi: Option.Option<number>;
}

export interface InstrumentPlugin {
  readonly kind: "instrument";
  readonly voice: (request: VoiceRequest) => Voice;
}

export interface PlayedEvent {
  readonly source: string;
  readonly time: number;
  readonly placement: Placement;
  readonly args: readonly PluginArgument[];
}

export interface PlayedTrack {
  readonly name: string;
  readonly bus: Bus;
  readonly events: readonly PlayedEvent[];
}

export interface MixRequest {
  readonly song: Song;
  readonly frames: number;
  readonly samples: Samples;
  readonly bus: (track: string) => Option.Option<Bus>;
  readonly play: (track: string) => readonly PlayedEvent[];
  readonly playInto: (bus: Bus) => (track: string) => readonly PlayedEvent[];
  readonly args: readonly PluginArgument[];
  readonly log: Ledger;
  readonly progress: (share: number, label: string) => void;
}

export interface GainStage {
  readonly kind: "gain";
  readonly curve: Float32Array<ArrayBuffer>;
  readonly every: number;
}

export interface ClipStage {
  readonly kind: "clip";
  readonly threshold: number;
  readonly knee: number;
}

export type Stage = GainStage | ClipStage;

export interface MixedStem {
  readonly name: string;
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
}

export interface Mix {
  readonly left: Float32Array<ArrayBuffer>;
  readonly right: Float32Array<ArrayBuffer>;
  readonly stems: readonly MixedStem[];
  readonly stages: readonly Stage[];
  readonly lanes: Readonly<Record<string, Lane>>;
  readonly live: Option.Option<LiveMix>;
}

export interface MixPlugin {
  readonly kind: "mix";
  readonly mix: (request: MixRequest) => Effect.Effect<Mix, never, Scope.Scope>;
}

export type FumxPlugin = InstrumentPlugin | MixPlugin;

export type Plugins = Readonly<Record<string, FumxPlugin>>;
