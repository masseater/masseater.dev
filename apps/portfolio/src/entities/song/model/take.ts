import type { Automation, NoteEvent, Take } from "@masseater.dev/daw-view";
import { Array as Arr, Option, Record as Rec, pipe, Predicate } from "effect";

import type { Ledger, Logged } from "#/entities/song/lib/studio/placement.ts";

import type { Lane, View } from "./form.ts";

const HERTZ = "Hz";
const NONE = 0;

const eventOf = (entry: Logged): NoteEvent => {
  const placed = {
    track: entry.track,
    sample: entry.sample,
    start: entry.start,
    duration: entry.duration,
    gain: entry.gain,
    offset: entry.offset,
    reversed: entry.reversed,
  };
  if (Predicate.isUndefined(entry.pitch)) {
    return { ...placed, kind: "hit" };
  }
  return {
    ...placed,
    kind: "note",
    pitch: entry.pitch,
    glide: pipe(
      entry.glide ?? [],
      Arr.map(([at, semitones]) => ({ at, semitones })),
    ),
  };
};

const scaleOf = (lane: Lane): Automation["scale"] =>
  Option.match(Option.fromUndefinedOr(lane.log), {
    onNone: () => "linear",
    onSome: () => "log",
  });

const unitOf = (lane: Lane): Automation["unit"] => {
  if (lane.unit === HERTZ) {
    return HERTZ;
  }
  return "level";
};

const automationOf =
  (shaded: string) =>
  ([name, lane]: readonly [string, Lane]): Automation => ({
    name,
    values: Arr.makeBy(lane.values.length, (index) => lane.values[index] ?? NONE),
    low: lane.low,
    high: lane.high,
    scale: scaleOf(lane),
    unit: unitOf(lane),
    shade: name === shaded,
  });

export const takeOf =
  (shaded: string) =>
  (log: readonly Logged[], view: View): Take => ({
    events: pipe(log, Arr.map(eventOf)),
    automation: pipe(Rec.toEntries(view.auto ?? {}), Arr.map(automationOf(shaded))),
    roots: view.roots ?? [],
  });

export interface Sheet {
  readonly log: Ledger;
  readonly show: (view: View) => void;
  readonly take: () => Take;
  readonly progress: (share: number, label: string) => void;
}

export const sheetOf =
  (shaded: string) =>
  (report: (progress: Readonly<{ share: number; label: string; take: Take }>) => void): Sheet => {
    const log: Logged[] = [];
    let shown: View = {};
    const take = (): Take => takeOf(shaded)(log, shown);
    return {
      log,
      show: (view) => {
        shown = view;
      },
      take,
      progress: (share, label) => {
        report({ share, label, take: take() });
      },
    };
  };
