import { Option, pipe } from "effect";

import type { LiveMix } from "./contract.ts";
import type { Deck } from "./deck.ts";
import type { LiveNode } from "./live.ts";
import { clamp } from "./math.ts";
import type { Mixdown } from "./mix.ts";

const TAIL = 0.05;
const START = 0;

export type Output =
  | { readonly kind: "buffer" }
  | { readonly kind: "pending"; readonly live: LiveMix }
  | { readonly kind: "opening" }
  | { readonly kind: "live"; readonly live: LiveNode };

export type Playback =
  | { readonly status: "paused"; readonly offset: number }
  | {
      readonly status: "playing";
      readonly offset: number;
      readonly startedAt: number;
      readonly deck: Deck;
      readonly source: Option.Option<AudioBufferSourceNode>;
    };

export interface Player {
  readonly sampleRate: number;
  readonly deck: Option.Option<Deck>;
  readonly mixdown: Option.Option<Mixdown>;
  readonly buffer: Option.Option<AudioBuffer>;
  readonly output: Output;
  readonly gains: Option.Option<Float32Array>;
  readonly playback: Playback;
  readonly wanted: boolean;
}

export const PAUSED: Playback = { status: "paused", offset: START };

export const idle = (sampleRate: number): Player => ({
  sampleRate,
  deck: Option.none(),
  mixdown: Option.none(),
  buffer: Option.none(),
  output: { kind: "buffer" },
  gains: Option.none(),
  playback: PAUSED,
  wanted: false,
});

export const offsetIn =
  ({ mixdown, sampleRate }: Pick<Player, "mixdown" | "sampleRate">) =>
  (seconds: number): number => {
    const duration = pipe(
      mixdown,
      Option.match({ onNone: () => START, onSome: ({ left }) => left.length / sampleRate }),
    );
    return clamp({ low: START, high: duration - TAIL })(seconds);
  };

export const positionOf = (playback: Playback): number => {
  if (playback.status === "playing") {
    return Math.max(
      playback.offset,
      playback.offset + playback.deck.context.currentTime - playback.startedAt,
    );
  }
  return playback.offset;
};

export const waitingIn = ({
  wanted,
  mixdown,
  output,
}: Pick<Player, "wanted" | "mixdown" | "output">): boolean =>
  wanted && (Option.isNone(mixdown) || output.kind === "opening");
