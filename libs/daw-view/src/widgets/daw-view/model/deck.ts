import { Effect } from "effect";

import type { Mixdown } from "./mix.ts";

const ANALYSER = { fftSize: 4096, smoothing: 0.72 } as const;
const NO_LATENCY = 0;
const CHANNELS = { count: 2, left: 0, right: 1 } as const;

export interface Deck {
  readonly context: AudioContext;
  readonly analyser: AnalyserNode;
}

export interface Levels {
  readonly levels: Uint8Array;
  readonly sampleRate: number;
}

export const openDeck = (): Deck => {
  const context = new AudioContext();
  const analyser = new AnalyserNode(context, {
    fftSize: ANALYSER.fftSize,
    smoothingTimeConstant: ANALYSER.smoothing,
  });
  analyser.connect(context.destination);
  return { context, analyser };
};

export const woken = (deck: Deck): Deck => {
  Effect.runFork(Effect.promise(() => deck.context.resume()));
  return deck;
};

export const latencyOf = ({ context }: Deck): number =>
  context.outputLatency || context.baseLatency || NO_LATENCY;

export const levelsOf = ({ context, analyser }: Deck): Levels => {
  const levels = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(levels);
  return { levels, sampleRate: context.sampleRate };
};

export const bufferOf =
  (sampleRate: number) =>
  ({ left, right }: Mixdown): AudioBuffer => {
    const buffer = new AudioBuffer({
      length: left.length,
      numberOfChannels: CHANNELS.count,
      sampleRate,
    });
    buffer.getChannelData(CHANNELS.left).set(left);
    buffer.getChannelData(CHANNELS.right).set(right);
    return buffer;
  };
