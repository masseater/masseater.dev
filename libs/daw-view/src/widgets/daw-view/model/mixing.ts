import { Array as Arr, Option, pipe } from "effect";

import type { Session, Track } from "#/entities/song/index.ts";

const ON = 1;
const OFF = 0;

export type Switch = "mute" | "solo";

export interface Change {
  readonly name: string;
  readonly flip: Switch;
}

export interface Mixing {
  readonly tracks: readonly string[];
  readonly muted: readonly string[];
  readonly soloed: readonly string[];
}

export const UNMIXED: Mixing = { tracks: [], muted: [], soloed: [] };

export const mixingOf = (tracks: readonly string[]): Mixing => ({ ...UNMIXED, tracks });

export const switchOf = (value: string | undefined): Switch => {
  if (value === "solo") {
    return "solo";
  }
  return "mute";
};

export const audible =
  ({ tracks, muted, soloed }: Mixing) =>
  (name: string): boolean =>
    !tracks.includes(name) ||
    (!muted.includes(name) && (soloed.length === OFF || soloed.includes(name)));

const gainOf =
  (mixing: Mixing) =>
  (name: string): number => {
    if (audible(mixing)(name)) {
      return ON;
    }
    return OFF;
  };

export const gainsOf = (mixing: Mixing): Float32Array =>
  Float32Array.from(mixing.tracks, gainOf(mixing));

const flipped = (names: readonly string[], name: string): readonly string[] => {
  if (names.includes(name)) {
    return pipe(
      names,
      Arr.filter((item) => item !== name),
    );
  }
  return [...names, name];
};

export const toggled =
  (change: Change) =>
  (mixing: Mixing): Mixing => {
    if (!mixing.tracks.includes(change.name)) {
      return mixing;
    }
    if (change.flip === "mute") {
      return { ...mixing, muted: flipped(mixing.muted, change.name) };
    }
    return { ...mixing, soloed: flipped(mixing.soloed, change.name) };
  };

export const pressedIn =
  (flip: Switch) =>
  (mixing: Mixing): readonly string[] => {
    if (flip === "mute") {
      return mixing.muted;
    }
    return mixing.soloed;
  };

const heardTrack =
  (mixing: Mixing) =>
  (track: Track): Track => ({ ...track, audible: audible(mixing)(track.name) });

export const heardIn =
  (mixing: Mixing) =>
  (session: Session): Session => ({
    ...session,
    tracks: pipe(session.tracks, Arr.map(heardTrack(mixing))),
  });

export const changeOf = (button: HTMLElement): Option.Option<Change> =>
  pipe(
    Option.fromUndefinedOr(button.dataset["of"]),
    Option.map((name) => ({ name, flip: switchOf(button.dataset["mix"]) })),
  );
