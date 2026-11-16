import { Array as Arr, Option, pipe } from "effect";

import type { Session, Track } from "#/entities/song/index.ts";

const NONE = 0;

export type Switch = "mute" | "solo";

export interface Change {
  readonly name: string;
  readonly flip: Switch;
}

export interface Mixer {
  readonly volumeDecibels: number;
  readonly pan: number;
  readonly muted: boolean;
}

export interface Channel {
  readonly name: string;
  readonly mixer: Mixer;
}

export interface Mixing {
  readonly channels: readonly Channel[];
  readonly soloed: readonly string[];
}

export const UNITY: Mixer = { volumeDecibels: 0, pan: 0, muted: false };

export const UNMIXED: Mixing = { channels: [], soloed: [] };

const channelIn =
  (mixers: Readonly<Record<string, Mixer>>) =>
  (name: string): Channel => ({
    name,
    mixer: Option.getOrElse(Option.fromUndefinedOr(mixers[name]), () => UNITY),
  });

export const mixingOf =
  (mixers: Readonly<Record<string, Mixer>>) =>
  (tracks: readonly string[]): Mixing => ({
    ...UNMIXED,
    channels: pipe(tracks, Arr.map(channelIn(mixers))),
  });

export const namesOf = ({ channels }: Mixing): readonly string[] =>
  pipe(
    channels,
    Arr.map(({ name }) => name),
  );

export const switchOf = (value: string | undefined): Switch => {
  if (value === "solo") {
    return "solo";
  }
  return "mute";
};

const mutedNames = ({ channels }: Mixing): readonly string[] =>
  pipe(
    channels,
    Arr.filter(({ mixer }) => mixer.muted),
    Arr.map(({ name }) => name),
  );

export const audible =
  (mixing: Mixing) =>
  (name: string): boolean =>
    !namesOf(mixing).includes(name) ||
    (!mutedNames(mixing).includes(name) &&
      (mixing.soloed.length === NONE || mixing.soloed.includes(name)));

export const heardMixers = (mixing: Mixing): readonly Mixer[] =>
  pipe(
    mixing.channels,
    Arr.map(({ name, mixer }) => ({ ...mixer, muted: !audible(mixing)(name) })),
  );

const flipped = (names: readonly string[], name: string): readonly string[] => {
  if (names.includes(name)) {
    return pipe(
      names,
      Arr.filter((item) => item !== name),
    );
  }
  return [...names, name];
};

const muteFlipped =
  (name: string) =>
  (channel: Channel): Channel => {
    if (channel.name !== name) {
      return channel;
    }
    return { ...channel, mixer: { ...channel.mixer, muted: !channel.mixer.muted } };
  };

export const toggled =
  (change: Change) =>
  (mixing: Mixing): Mixing => {
    if (!namesOf(mixing).includes(change.name)) {
      return mixing;
    }
    if (change.flip === "mute") {
      return { ...mixing, channels: pipe(mixing.channels, Arr.map(muteFlipped(change.name))) };
    }
    return { ...mixing, soloed: flipped(mixing.soloed, change.name) };
  };

export const pressedIn =
  (flip: Switch) =>
  (mixing: Mixing): readonly string[] => {
    if (flip === "mute") {
      return mutedNames(mixing);
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
