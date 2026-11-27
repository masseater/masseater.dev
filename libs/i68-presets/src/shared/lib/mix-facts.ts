import { MIXER_PARAMETERS } from "@r_masseater/fumx-parser";
import type { MixerParameter, Song } from "@r_masseater/fumx-parser";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { MixHabit } from "./mix-habit.ts";

const DECIBEL_STEP = 3;
const PAN_STEPS = 4;
const SEND_STEPS = 10;
const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const COPY = /-\d+$/u;

export interface MixPlace {
  readonly bar: number;
  readonly line: number;
  readonly column: number;
}

export interface MixFact {
  readonly habit: MixHabit;
  readonly place: MixPlace;
}

type Track = Song["tracks"][number];

export const trackKeyOf = (name: string): string => Str.replace(COPY, "")(name);

const stepped =
  (steps: number) =>
  (value: number): number =>
    Math.round(value * steps) / steps;

const decibelsStepped = (decibels: number): number =>
  Math.round(decibels / DECIBEL_STEP) * DECIBEL_STEP;

export const placeIn =
  (soundings: readonly Sounding[]) =>
  ({ track, bar }: Readonly<{ track: string; bar: number }>): MixPlace =>
    pipe(
      soundings,
      Arr.findFirst((sounding) => sounding.track === track && sounding.bar >= bar),
      Option.match({
        onNone: () => ({ bar, line: FIRST_LINE, column: FIRST_COLUMN }),
        onSome: (sounding) => ({ bar, line: sounding.line, column: sounding.column }),
      }),
    );

const loudestOf = (tracks: readonly Track[]): number =>
  Math.max(
    ...pipe(
      tracks,
      Arr.map((track) => track.mixer.volumeDecibels),
    ),
  );

const levelHabitsOf =
  (tracks: readonly Track[]) =>
  (track: Track): readonly MixHabit[] => [
    {
      type: "level",
      track: trackKeyOf(track.name),
      decibels: decibelsStepped(track.mixer.volumeDecibels - loudestOf(tracks)),
    },
    { type: "pan", track: trackKeyOf(track.name), pan: stepped(PAN_STEPS)(track.mixer.pan) },
    ...pipe(
      track.sends,
      Arr.map((send): MixHabit => ({
        type: "send",
        track: trackKeyOf(track.name),
        bus: trackKeyOf(send.bus),
        amount: stepped(SEND_STEPS)(send.amount),
      })),
    ),
  ];

const sectionStartsOf = (song: Song): readonly number[] =>
  pipe(
    song.bars,
    Arr.drop(FIRST_LINE),
    Arr.filter((bar) => Option.isSome(bar.section) || Option.isSome(bar.mark)),
    Arr.map((bar) => bar.index),
  );

type Automation = Song["automations"][number];

const isMove = (
  automation: Automation,
): automation is Automation & {
  readonly parameter: MixerParameter;
} => Arr.contains(MIXER_PARAMETERS, automation.parameter);

const directionOf = (automation: Automation): "up" | "down" => {
  if (automation.to.value > automation.from.value) {
    return "up";
  }
  return "down";
};

type Moved = Readonly<{ habit: MixHabit; bar: number; target: string }>;

const movesOf =
  (starts: readonly number[]) =>
  (automation: Automation): readonly Moved[] => {
    if (!isMove(automation) || automation.from.value === automation.to.value) {
      return [];
    }
    const direction = directionOf(automation);
    const end = automation.bar + automation.bars;
    const base = {
      type: "move" as const,
      track: trackKeyOf(automation.target),
      parameter: automation.parameter,
      direction,
    };
    return [
      ...pipe(
        starts,
        Arr.filter((start) => start === end),
        Arr.map((start) => ({
          habit: { ...base, edge: "before" as const },
          bar: start,
          target: automation.target,
        })),
      ),
      ...pipe(
        starts,
        Arr.filter((start) => start === automation.bar),
        Arr.map((start) => ({
          habit: { ...base, edge: "after" as const },
          bar: start,
          target: automation.target,
        })),
      ),
    ];
  };

export const mixFactsOf =
  (soundings: readonly Sounding[]) =>
  (song: Song): readonly MixFact[] => {
    const place = placeIn(soundings);
    const firstBar = pipe(
      Arr.head(song.bars),
      Option.match({ onNone: () => FIRST_LINE, onSome: (bar) => bar.index }),
    );
    const moves = movesOf(sectionStartsOf(song));
    return [
      ...pipe(
        song.tracks,
        Arr.flatMap((track) =>
          pipe(
            levelHabitsOf(song.tracks)(track),
            Arr.map((habit) => ({ habit, place: place({ track: track.name, bar: firstBar }) })),
          ),
        ),
      ),
      ...pipe(
        song.automations,
        Arr.flatMap(moves),
        Arr.map(({ habit, bar, target }) => ({ habit, place: place({ track: target, bar }) })),
      ),
    ];
  };
