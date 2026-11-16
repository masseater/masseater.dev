import type { Automation, NoteEvent, Take } from "@masseater.dev/daw-view";
import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import type { Lane, Ledger, Log, Logged, View } from "./program.ts";

const HERTZ = "Hz";
const NONE = 0;

const eventOf = (entry: Logged): NoteEvent => {
  const placed = {
    track: entry.tr,
    sample: entry.s,
    start: entry.t,
    duration: entry.d,
    gain: entry.g,
    offset: entry.off,
    reversed: Boolean(entry.rev),
  };
  if (entry.m === null) {
    return { ...placed, kind: "hit" };
  }
  return {
    ...placed,
    kind: "note",
    pitch: entry.m,
    glide: pipe(
      entry.pc ?? [],
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
    values: Arr.makeBy(lane.v.length, (index) => lane.v[index] ?? NONE),
    low: lane.lo,
    high: lane.hi,
    scale: scaleOf(lane),
    unit: unitOf(lane),
    shade: name === shaded,
  });

export const takeOf =
  (shaded: string) =>
  (log: Log, view: View): Take => ({
    events: pipe(log, Arr.filter(Predicate.isNotNull), Arr.map(eventOf)),
    automation: pipe(Rec.toEntries(view.auto ?? {}), Arr.map(automationOf(shaded))),
    roots: view.roots ?? [],
  });

export interface Sheet {
  readonly log: Ledger;
  readonly view: View;
  readonly take: () => Take;
  readonly progress: (share: number, label: string) => void;
}

export const sheetOf =
  (shaded: string) =>
  (report: (progress: Readonly<{ share: number; label: string; take: Take }>) => void): Sheet => {
    const log: (Logged | null)[] = [];
    const view: View = {};
    const take = (): Take => takeOf(shaded)(log, view);
    return {
      log,
      view,
      take,
      progress: (share, label) => {
        report({ share, label, take: take() });
      },
    };
  };
