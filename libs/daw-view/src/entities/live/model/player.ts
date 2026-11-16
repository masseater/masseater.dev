export interface Mixer {
  readonly volumeDecibels: number;
  readonly pan: number;
  readonly muted: boolean;
}

export interface MixMessage {
  readonly play?: number;
  readonly stop?: true;
  readonly mixers?: readonly Mixer[];
}

export interface MixPlayer {
  readonly msg: (message: MixMessage) => void;
  readonly render: (left: Float32Array, right: Float32Array, frames: number) => number;
}

export interface TrackBlock {
  readonly channels: number;
  readonly scale: number;
  readonly data: Int16Array;
}

export interface TapeSource {
  readonly frames: number;
  readonly block: (index: number) => readonly TrackBlock[];
}

export interface PlayerSetup {
  readonly init: unknown;
  readonly sampleRate: number;
  readonly tape: TapeSource;
}

export type PlayerFactory = (setup: PlayerSetup) => MixPlayer;
