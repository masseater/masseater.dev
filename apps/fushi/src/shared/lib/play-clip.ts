import { useAtom } from "@effect/atom-react";
import { Duration, Effect, Fiber, Option, Schedule, pipe } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

import { playNotes } from "./play.ts";
import type { Snippet } from "./play.ts";

type Now = Readonly<{ key: string; fraction: number; stop: () => void }>;

const WHOLE = 1;

const START = 0;

const TICK_MILLIS = 30;

const TICK = Duration.millis(TICK_MILLIS);

const ticked = Schedule.spaced(TICK);

const nowAtom = Atom.make(Option.none<Now>()).pipe(Atom.keepAlive);

type Watch = Readonly<{
  snippet: Snippet;
  onTick: (fraction: number) => void;
  onEnd: () => void;
}>;

const started = ({ snippet, onTick, onEnd }: Watch): (() => void) => {
  const playing = playNotes(snippet);
  const ticking = Effect.sync(() => {
    const fraction = Math.max(START, playing.fraction());
    onTick(fraction);
    return fraction;
  });
  const ended = Effect.sync(onEnd);
  const watching = ticking.pipe(
    Effect.repeat({ schedule: ticked, while: (fraction) => fraction < WHOLE }),
    Effect.andThen(ended),
  );
  const fiber = Effect.runFork(watching);
  return () => {
    playing.stop();
    fiber.pipe(Fiber.interrupt, Effect.runFork);
  };
};

const halt = (now: Option.Option<Now>): void => {
  if (Option.isSome(now)) {
    now.value.stop();
  }
};

export type ClipControls = Readonly<{ fraction: Option.Option<number>; toggle: () => void }>;

export const usePlayClip = ({
  key,
  snippet,
}: Readonly<{ key: string; snippet: Snippet }>): ClipControls => {
  const [now, setNow] = useAtom(nowAtom);
  const toggle = useCallback(() => {
    halt(now);
    if (Option.exists(now, (current) => current.key === key)) {
      setNow(Option.none());
      return;
    }
    const stop = started({
      snippet,
      onTick: (fraction) => {
        setNow(Option.map((current: Now) => ({ ...current, fraction })));
      },
      onEnd: () => {
        setNow(Option.none());
      },
    });
    setNow(Option.some({ key, fraction: START, stop }));
  }, [now, key, snippet, setNow]);
  const fraction = pipe(
    now,
    Option.filter((current) => current.key === key),
    Option.map((current) => current.fraction),
  );
  return { fraction, toggle };
};
