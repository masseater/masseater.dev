import { Array as Arr, Option, pipe } from "effect";

import { trackColor, barBeat, noteName, eventsBetween } from "#/entities/song/index.ts";
import type { Tint, NoteEvent, Timing, Track } from "#/entities/song/index.ts";
import { make } from "#/shared/lib/dom.ts";
import { glideAt, glides } from "#/widgets/daw-view/model/roll-layout.ts";

const LIMIT = 5;
const NONE = 0;
const MILLISECONDS = 1000;
const GAIN_DECIMALS = 2;
const SWATCH = "--daw-swatch";
const KEY = "readout";
const SEPARATOR = " · ";

const CLASS = {
  track: "font-semibold text-(--daw-swatch)",
  text: "text-ink",
} as const;

export interface ReadoutInput {
  readonly tracks: readonly Track[];
  readonly hover: Option.Option<NoteEvent>;
  readonly time: number;
  readonly timing: Timing;
  readonly tint: Tint;
}

interface Entry {
  readonly track: Track;
  readonly text: string;
}

interface Readout {
  readonly entries: readonly Entry[];
  readonly tail: string;
}

const pitchAt = (event: NoteEvent, time: number): string => {
  if (event.kind === "note") {
    return ` ${noteName(event.pitch + glideAt(event)(time - event.start))}`;
  }
  return "";
};

const soundingOf =
  (time: number) =>
  (track: Track): readonly Entry[] => {
    const names = pipe(
      eventsBetween({ from: time, to: time })(track),
      Arr.filter((event) => time < event.start + event.duration),
      Arr.map((event) => `${event.sample}${pitchAt(event, time)}`),
      Arr.dedupe,
    );
    if (names.length === NONE) {
      return [];
    }
    const more = pipe(
      Option.liftPredicate(names.length - LIMIT, (rest) => rest > NONE),
      Option.match({ onNone: () => "", onSome: (rest) => ` +${rest}` }),
    );
    return [{ track, text: `${pipe(names, Arr.take(LIMIT), Arr.join(", "))}${more}` }];
  };

const signed = (semitones: number): string => {
  if (semitones > NONE) {
    return `+${semitones}`;
  }
  return String(semitones);
};

const glideOf = (event: NoteEvent): readonly string[] => {
  if (event.kind === "note" && glides(event)) {
    return pipe(
      Arr.head(event.glide),
      Option.map((point) => `glide ${signed(point.semitones)}`),
      Option.toArray,
    );
  }
  return [];
};

const offsetOf = (event: NoteEvent): readonly string[] => {
  if (event.offset > NONE) {
    return [`from ${event.offset.toFixed(GAIN_DECIMALS)} s`];
  }
  return [];
};

const reversedOf = (event: NoteEvent): string => {
  if (event.reversed) {
    return " reverse";
  }
  return "";
};

const detailOf = (timing: Timing, event: NoteEvent): string =>
  pipe(
    [
      "",
      barBeat(timing)(event.start),
      `${(event.duration * MILLISECONDS).toFixed(NONE)} ms`,
      `gain ${event.gain.toFixed(GAIN_DECIMALS)}`,
      ...offsetOf(event),
      ...glideOf(event),
    ],
    Arr.join(SEPARATOR),
  );

const hovered = (input: ReadoutInput, event: NoteEvent): Readout => {
  const text = `${event.sample}${pitchAt(event, event.start)}${reversedOf(event)}`;
  return {
    entries: pipe(
      input.tracks,
      Arr.findFirst((track) => track.name === event.track),
      Option.map((track) => ({ track, text })),
      Option.toArray,
    ),
    tail: detailOf(input.timing, event),
  };
};

const readoutOf = (input: ReadoutInput): Readout =>
  pipe(
    input.hover,
    Option.match({
      onNone: () => ({
        entries: pipe(input.tracks, Arr.flatMap(soundingOf(input.time))),
        tail: "",
      }),
      onSome: (event) => hovered(input, event),
    }),
  );

const keyOf = ({ entries, tail }: Readout, tint: Tint): string =>
  pipe(
    entries,
    Arr.map((entry) => `${entry.track.name}:${entry.text}`),
    Arr.append(tail),
    Arr.append(String(tint.lightness)),
    Arr.join("|"),
  );

const nodesOf =
  (tint: Tint) =>
  ({ track, text }: Entry, index: number): readonly (HTMLElement | string)[] => {
    const name = make("b")(CLASS.track, [track.name]);
    name.style.setProperty(SWATCH, trackColor(tint)(track));
    const nodes = [name, make("span")(CLASS.text, [` ${text}`])];
    if (index > NONE) {
      return [SEPARATOR, ...nodes];
    }
    return nodes;
  };

export const paintReadout =
  (node: HTMLElement) =>
  (input: ReadoutInput): void => {
    const readout = readoutOf(input);
    const key = keyOf(readout, input.tint);
    if (node.dataset[KEY] !== key) {
      const nodes = pipe(readout.entries, Arr.flatMap(nodesOf(input.tint)));
      node.dataset[KEY] = key;
      node.replaceChildren(...nodes, readout.tail);
    }
  };
