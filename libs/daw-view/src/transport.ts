import { Effect, Option, pipe } from "effect";

import type { LiveMix } from "./contract.ts";
import { bufferOf, latencyOf, levelsOf, openDeck, woken } from "./deck.ts";
import type { Deck, Levels } from "./deck.ts";
import { HEARD, liveSupported, openLive } from "./live.ts";
import type { Heard, LiveNode } from "./live.ts";
import { clamp } from "./math.ts";
import type { Mixdown } from "./mix.ts";
import { gainsOf } from "./mixing.ts";
import type { Mixing } from "./mixing.ts";
import { PAUSED, idle, offsetIn, positionOf, waitingIn } from "./playback.ts";
import type { Output, Playback, Player } from "./playback.ts";
import { createStore } from "./store.ts";
import type { Store } from "./store.ts";

const LEAD = 0.03;
const TAIL = 0.05;
const START = 0;

export interface TransportOptions {
  readonly sampleRate: number;
  readonly duration: number;
  readonly onChange: () => void;
  readonly onLost: () => void;
}

export interface Transport {
  readonly press: () => void;
  readonly seek: (seconds: number) => void;
  readonly load: (mixdown: Mixdown, live: Option.Option<LiveMix>) => readonly string[];
  readonly mix: (mixing: Mixing) => void;
  readonly position: () => number;
  readonly playing: () => boolean;
  readonly waiting: () => boolean;
  readonly levels: () => Option.Option<Levels>;
}

interface Cue {
  readonly deck: Deck;
  readonly seconds: number;
}

interface Bench {
  readonly player: Store<Player>;
  readonly onLost: () => void;
}

interface Started {
  readonly offset: number;
  readonly startedAt: number;
}

const deckOf = (player: Store<Player>): Deck => {
  const deck = woken(Option.getOrElse(player.read().deck, openDeck));
  player.step((state) => ({ ...state, deck: Option.some(deck) }));
  return deck;
};

const halt = (playback: Playback): void => {
  if (playback.status === "playing" && Option.isSome(playback.source)) {
    playback.source.value.stop();
    playback.source.value.disconnect();
  }
};

const finish = (player: Store<Player>, source: AudioBufferSourceNode): void => {
  const { playback } = player.read();
  if (playback.status === "playing" && Option.contains(playback.source, source)) {
    player.step((state) => ({ ...state, playback: PAUSED }));
  }
};

const started = (
  player: Store<Player>,
  cue: Cue,
  source: Option.Option<AudioBufferSourceNode>,
): Started => {
  const offset = offsetIn(player.read())(cue.seconds);
  const startedAt = cue.deck.context.currentTime + LEAD;
  player.step((state) => ({
    ...state,
    playback: { status: "playing", offset, startedAt, deck: cue.deck, source },
  }));
  return { offset, startedAt };
};

const beginBuffer = (player: Store<Player>, cue: Cue, buffer: AudioBuffer): void => {
  const source = new AudioBufferSourceNode(cue.deck.context, { buffer });
  halt(player.read().playback);
  source.connect(cue.deck.analyser);
  source.addEventListener("ended", () => {
    finish(player, source);
  });
  const { offset, startedAt } = started(player, cue, Option.some(source));
  source.start(startedAt, offset);
};

const beginLive = (player: Store<Player>, cue: Cue, live: LiveNode): void => {
  halt(player.read().playback);
  const { offset } = started(player, cue, Option.none());
  live.send({ play: Math.round(offset * player.read().sampleRate) });
};

const pause = (player: Store<Player>): void => {
  const { playback, output } = player.read();
  const offset = positionOf(playback);
  halt(playback);
  if (output.kind === "live") {
    output.live.send({ stop: true });
  }
  player.step((state) => ({ ...state, playback: { status: "paused", offset } }));
};

const bufferFor = (player: Store<Player>): Option.Option<AudioBuffer> => {
  const { buffer, mixdown, sampleRate } = player.read();
  if (Option.isSome(buffer) || Option.isNone(mixdown)) {
    return buffer;
  }
  const built = Option.some(bufferOf(sampleRate)(mixdown.value));
  player.step((state) => ({ ...state, buffer: built }));
  return built;
};

const heard =
  (player: Store<Player>) =>
  (event: Heard): void => {
    const { playback, sampleRate } = player.read();
    if (playback.status !== "playing") {
      return;
    }
    if (event.heard === HEARD.started) {
      const offset = event.frame / sampleRate;
      const startedAt = event.at + latencyOf(playback.deck);
      player.step((state) => ({ ...state, playback: { ...playback, offset, startedAt } }));
    } else {
      player.step((state) => ({ ...state, playback: PAUSED }));
    }
  };

const pressBuffer = (player: Store<Player>, deck: Deck): void => {
  const buffer = bufferFor(player);
  const { playback } = player.read();
  if (Option.isNone(buffer)) {
    player.step((state) => ({ ...state, wanted: !state.wanted }));
  } else if (playback.status === "playing") {
    pause(player);
  } else {
    beginBuffer(player, { deck, seconds: playback.offset }, buffer.value);
  }
};

const pressLive = (player: Store<Player>, deck: Deck, live: LiveNode): void => {
  const { playback } = player.read();
  if (playback.status === "playing") {
    pause(player);
  } else {
    beginLive(player, { deck, seconds: playback.offset }, live);
  }
};

const wantedNow = (player: Store<Player>): boolean => {
  const { wanted } = player.read();
  player.step((state) => ({ ...state, wanted: false }));
  return wanted;
};

const opened =
  (bench: Bench, deck: Deck) =>
  (live: LiveNode): Effect.Effect<void> =>
    Effect.sync(() => {
      live.connect(deck.analyser);
      const { gains } = bench.player.read();
      if (Option.isSome(gains)) {
        live.send({ gains: gains.value });
      }
      bench.player.step((state) => ({ ...state, output: { kind: "live", live } }));
      if (wantedNow(bench.player)) {
        pressLive(bench.player, deck, live);
      }
    });

const lost = (bench: Bench, deck: Deck) => (): Effect.Effect<void> =>
  Effect.sync(() => {
    bench.player.step((state) => ({ ...state, output: { kind: "buffer" } }));
    bench.onLost();
    if (wantedNow(bench.player)) {
      pressBuffer(bench.player, deck);
    }
  });

const open = (bench: Bench, deck: Deck, live: LiveMix): void => {
  bench.player.step((state) => ({ ...state, output: { kind: "opening" }, wanted: true }));
  const opening = openLive({ context: deck.context, live, onHeard: heard(bench.player) });
  const settled = Effect.matchEffect(opening, {
    onFailure: lost(bench, deck),
    onSuccess: opened(bench, deck),
  });
  Effect.runFork(settled);
};

const press = (bench: Bench): void => {
  const { player } = bench;
  const deck = deckOf(player);
  const { output } = player.read();
  if (output.kind === "pending") {
    open(bench, deck, output.live);
  } else if (output.kind === "opening") {
    player.step((state) => ({ ...state, wanted: !state.wanted }));
  } else if (output.kind === "live") {
    pressLive(player, deck, output.live);
  } else {
    pressBuffer(player, deck);
  }
};

const seek = (player: Store<Player>, seconds: number): void => {
  const { buffer, playback, output } = player.read();
  if (playback.status === "playing" && output.kind === "live") {
    beginLive(player, { deck: playback.deck, seconds }, output.live);
  } else if (playback.status === "playing" && Option.isSome(buffer)) {
    beginBuffer(player, { deck: playback.deck, seconds }, buffer.value);
  } else {
    player.step((state) => ({ ...state, playback: { status: "paused", offset: seconds } }));
  }
};

const outputFor = (live: Option.Option<LiveMix>): Output => {
  if (Option.isSome(live) && liveSupported()) {
    return { kind: "pending", live: live.value };
  }
  return { kind: "buffer" };
};

const mixedIn = (output: Output): readonly string[] => {
  if (output.kind === "pending") {
    return output.live.tracks;
  }
  return [];
};

const load = (bench: Bench, mixdown: Mixdown, live: Option.Option<LiveMix>): readonly string[] => {
  const output = outputFor(live);
  bench.player.step((state) => ({
    ...state,
    mixdown: Option.some(mixdown),
    buffer: Option.none(),
    output,
  }));
  if (wantedNow(bench.player)) {
    press(bench);
  }
  return mixedIn(output);
};

const mix = (player: Store<Player>, mixing: Mixing): void => {
  const { output } = player.read();
  const gains = gainsOf(mixing);
  player.step((state) => ({ ...state, gains: Option.some(gains) }));
  if (output.kind === "live") {
    output.live.send({ gains });
  }
};

export const createTransport = ({
  sampleRate,
  duration,
  onChange,
  onLost,
}: TransportOptions): Transport => {
  const player = createStore({ initial: idle(sampleRate), onChange });
  const bench = { player, onLost };
  const within = clamp({ low: START, high: duration });
  return {
    press: () => {
      press(bench);
    },
    seek: (seconds) => {
      seek(player, clamp({ low: START, high: duration - TAIL })(seconds));
    },
    load: (mixdown, live) => load(bench, mixdown, live),
    mix: (mixing) => {
      mix(player, mixing);
    },
    position: () => within(positionOf(player.read().playback)),
    playing: () => player.read().playback.status === "playing",
    waiting: () => waitingIn(player.read()),
    levels: () => pipe(player.read().deck, Option.map(levelsOf)),
  };
};
