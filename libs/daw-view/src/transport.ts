import { Effect, Option, pipe } from "effect";

import { clamp } from "./math.ts";
import type { Mixdown } from "./mix.ts";
import { createStore } from "./store.ts";
import type { Store } from "./store.ts";

const ANALYSER = { fftSize: 4096, smoothing: 0.72 } as const;
const LEAD = 0.03;
const TAIL = 0.05;
const START = 0;
const CHANNELS = { count: 2, left: 0, right: 1 } as const;

interface Deck {
  readonly context: AudioContext;
  readonly analyser: AnalyserNode;
}

type Playback =
  | { readonly status: "paused"; readonly offset: number }
  | {
      readonly status: "playing";
      readonly offset: number;
      readonly startedAt: number;
      readonly deck: Deck;
      readonly source: AudioBufferSourceNode;
    };

interface Player {
  readonly sampleRate: number;
  readonly deck: Option.Option<Deck>;
  readonly mixdown: Option.Option<Mixdown>;
  readonly buffer: Option.Option<AudioBuffer>;
  readonly playback: Playback;
  readonly wanted: boolean;
}

export interface Levels {
  readonly levels: Uint8Array;
  readonly sampleRate: number;
}

export interface TransportOptions {
  readonly sampleRate: number;
  readonly duration: number;
  readonly onChange: () => void;
}

export interface Transport {
  readonly press: () => void;
  readonly seek: (seconds: number) => void;
  readonly load: (mixdown: Mixdown) => void;
  readonly position: () => number;
  readonly playing: () => boolean;
  readonly waiting: () => boolean;
  readonly levels: () => Option.Option<Levels>;
}

interface Cue {
  readonly deck: Deck;
  readonly buffer: AudioBuffer;
  readonly seconds: number;
}

const idle = (sampleRate: number): Player => ({
  sampleRate,
  deck: Option.none(),
  mixdown: Option.none(),
  buffer: Option.none(),
  playback: { status: "paused", offset: START },
  wanted: false,
});

const openDeck = (): Deck => {
  const context = new AudioContext();
  const analyser = new AnalyserNode(context, {
    fftSize: ANALYSER.fftSize,
    smoothingTimeConstant: ANALYSER.smoothing,
  });
  analyser.connect(context.destination);
  return { context, analyser };
};

const deckOf = (player: Store<Player>): Deck => {
  const deck = Option.getOrElse(player.read().deck, openDeck);
  Effect.runFork(Effect.promise(() => deck.context.resume()));
  player.step((state) => ({ ...state, deck: Option.some(deck) }));
  return deck;
};

const halt = (playback: Playback): void => {
  if (playback.status === "playing") {
    playback.source.stop();
    playback.source.disconnect();
  }
};

const finish = (player: Store<Player>, source: AudioBufferSourceNode): void => {
  const { playback } = player.read();
  if (playback.status === "playing" && playback.source === source) {
    player.step((state) => ({ ...state, playback: { status: "paused", offset: START } }));
  }
};

const begin = (player: Store<Player>, { deck, buffer, seconds }: Cue): void => {
  const offset = clamp({ low: START, high: buffer.duration - TAIL })(seconds);
  const source = new AudioBufferSourceNode(deck.context, { buffer });
  const startedAt = deck.context.currentTime + LEAD;
  halt(player.read().playback);
  source.connect(deck.analyser);
  source.start(startedAt, offset);
  source.addEventListener("ended", () => {
    finish(player, source);
  });
  player.step((state) => ({
    ...state,
    playback: { status: "playing", offset, startedAt, deck, source },
  }));
};

const positionOf = (playback: Playback): number => {
  if (playback.status === "playing") {
    return playback.offset + playback.deck.context.currentTime - playback.startedAt;
  }
  return playback.offset;
};

const pause = (player: Store<Player>): void => {
  const { playback } = player.read();
  const offset = positionOf(playback);
  halt(playback);
  player.step((state) => ({ ...state, playback: { status: "paused", offset } }));
};

const bufferOf = ({ left, right }: Mixdown, sampleRate: number): AudioBuffer => {
  const buffer = new AudioBuffer({
    length: left.length,
    numberOfChannels: CHANNELS.count,
    sampleRate,
  });
  buffer.getChannelData(CHANNELS.left).set(left);
  buffer.getChannelData(CHANNELS.right).set(right);
  return buffer;
};

const bufferFor = (player: Store<Player>): Option.Option<AudioBuffer> => {
  const { buffer, mixdown, sampleRate } = player.read();
  if (Option.isSome(buffer) || Option.isNone(mixdown)) {
    return buffer;
  }
  const built = Option.some(bufferOf(mixdown.value, sampleRate));
  player.step((state) => ({ ...state, buffer: built }));
  return built;
};

const press = (player: Store<Player>): void => {
  const deck = deckOf(player);
  const buffer = bufferFor(player);
  const { playback } = player.read();
  if (Option.isNone(buffer)) {
    player.step((state) => ({ ...state, wanted: !state.wanted }));
  } else if (playback.status === "playing") {
    pause(player);
  } else {
    begin(player, { deck, buffer: buffer.value, seconds: playback.offset });
  }
};

const seek = (player: Store<Player>, seconds: number): void => {
  const { buffer, playback } = player.read();
  if (playback.status === "playing" && Option.isSome(buffer)) {
    begin(player, { deck: playback.deck, buffer: buffer.value, seconds });
  } else {
    player.step((state) => ({ ...state, playback: { status: "paused", offset: seconds } }));
  }
};

const load = (player: Store<Player>, mixdown: Mixdown): void => {
  const { wanted } = player.read();
  player.step((state) => ({
    ...state,
    mixdown: Option.some(mixdown),
    buffer: Option.none(),
    wanted: false,
  }));
  if (wanted) {
    press(player);
  }
};

const levelsOf = ({ context, analyser }: Deck): Levels => {
  const levels = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(levels);
  return { levels, sampleRate: context.sampleRate };
};

export const createTransport = ({
  sampleRate,
  duration,
  onChange,
}: TransportOptions): Transport => {
  const player = createStore({ initial: idle(sampleRate), onChange });
  const within = clamp({ low: START, high: duration });
  return {
    press: () => {
      press(player);
    },
    seek: (seconds) => {
      seek(player, clamp({ low: START, high: duration - TAIL })(seconds));
    },
    load: (mixdown) => {
      load(player, mixdown);
    },
    position: () => within(positionOf(player.read().playback)),
    playing: () => player.read().playback.status === "playing",
    waiting: () => player.read().wanted && Option.isNone(player.read().mixdown),
    levels: () => pipe(player.read().deck, Option.map(levelsOf)),
  };
};
