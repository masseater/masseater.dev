import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

export type Playback = "playing" | "paused";

const NEXT = { playing: "paused", paused: "playing" } as const satisfies Readonly<
  Record<Playback, Playback>
>;

const playbackAtom = Atom.make<Playback>("playing");

export const useDanmakuPlayback = (): Playback => useAtomValue(playbackAtom);

export const useToggleDanmaku = (): (() => void) => {
  const setPlayback = useAtomSet(playbackAtom);
  return useCallback(() => {
    setPlayback((playback) => NEXT[playback]);
  }, [setPlayback]);
};
