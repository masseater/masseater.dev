import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array as Arr, Duration, Effect, Fiber, Schedule, pipe } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

import { context } from "./tracks.ts";
import type { Track } from "./tracks.ts";

export type Mix = Readonly<{ muted: readonly string[]; soloed: readonly string[] }>;

export type Running = Readonly<{ stop: () => void; remix: (mix: Mix) => void }>;

export type Playback =
  | Readonly<{ status: "stopped"; position: number }>
  | Readonly<{ status: "playing"; position: number; running: Running }>;

export type Controls = Readonly<{ toggle: () => void; seek: (seconds: number) => void }>;

export type Deck = Readonly<{ tracks: readonly Track[]; duration: number }>;

type Voice = Readonly<{ stem: string; level: (value: number) => void; stop: () => void }>;

const START = 0;

const TICK_MILLIS = 50;

const TICK = Duration.millis(TICK_MILLIS);

const playbackAtom = Atom.make<Playback>({ status: "stopped", position: START }).pipe(
  Atom.keepAlive,
);

/** @internal */
export const mixAtom = Atom.make<Mix>({ muted: [], soloed: [] }).pipe(Atom.keepAlive);

export const levelOf =
  (mix: Mix) =>
  (stem: string): number => {
    if (Arr.isReadonlyArrayNonEmpty(mix.soloed)) {
      return Number(Arr.contains(mix.soloed, stem));
    }
    return Number(!Arr.contains(mix.muted, stem));
  };

const voiced =
  (mix: Mix, offset: number) =>
  ({ stem, buffer }: Track): Voice => {
    const gain = new GainNode(context, { gain: levelOf(mix)(stem) });
    gain.connect(context.destination);
    const source = new AudioBufferSourceNode(context, { buffer });
    source.connect(gain);
    source.start(context.currentTime, offset);
    return {
      stem,
      level: (value) => {
        gain.gain.value = value;
      },
      stop: () => {
        source.stop();
        source.disconnect();
        gain.disconnect();
      },
    };
  };

type Start = Readonly<{
  deck: Deck;
  mix: Mix;
  from: number;
  onTick: (position: number) => void;
}>;

const started = ({ deck, mix, from, onTick }: Start): Running => {
  const origin = context.currentTime - from;
  const voices = pipe(deck.tracks, Arr.map(voiced(mix, from)));
  const ticking = Effect.sync(() => {
    onTick(context.currentTime - origin);
  });
  const fiber = Effect.runFork(Effect.repeat(ticking, Schedule.spaced(TICK)));
  return {
    remix: (next) => {
      for (const voice of voices) {
        voice.level(levelOf(next)(voice.stem));
      }
    },
    stop: () => {
      fiber.pipe(Fiber.interrupt, Effect.runFork);
      for (const voice of voices) {
        voice.stop();
      }
    },
  };
};

const halt = (playback: Playback): void => {
  if (playback.status === "playing") {
    playback.running.stop();
  }
};

export const usePlayback = (): Playback => useAtomValue(playbackAtom);

const stopAtom = Atom.writable(
  () => START,
  (writer, _request: true) => {
    halt(writer.get(playbackAtom));
    writer.set(playbackAtom, { status: "stopped", position: START });
  },
);

export const useStop = (): ((request: true) => void) => useAtomSet(stopAtom);

const useBegin = (deck: Deck): ((from: number) => void) => {
  const mix = useAtomValue(mixAtom);
  const set = useAtomSet(playbackAtom);
  return useCallback(
    (from: number) => {
      const running = started({
        deck,
        mix,
        from,
        onTick: (position) => {
          if (position < deck.duration) {
            set((current) => ({ ...current, position }));
            return;
          }
          running.stop();
          set({ status: "stopped", position: START });
        },
      });
      Effect.runFork(Effect.promise(() => context.resume()));
      set({ status: "playing", position: from, running });
    },
    [deck, mix, set],
  );
};

export const useControls = (deck: Deck): Controls => {
  const playback = useAtomValue(playbackAtom);
  const set = useAtomSet(playbackAtom);
  const begin = useBegin(deck);
  const toggle = useCallback(() => {
    halt(playback);
    if (playback.status === "playing") {
      set({ status: "stopped", position: playback.position });
      return;
    }
    begin(playback.position);
  }, [begin, playback, set]);
  const seek = useCallback(
    (seconds: number) => {
      halt(playback);
      if (playback.status === "playing") {
        begin(seconds);
        return;
      }
      set({ status: "stopped", position: seconds });
    },
    [begin, playback, set],
  );
  return { toggle, seek };
};
