import { Predicate, Record as Rec } from "effect";
import type { Option } from "effect";

import { SAMPLE_RATE } from "#/shared/lib/dsp/number.ts";

import { repeatSlice, reverseSlice, tapeStop } from "./edits.ts";
import { fieldOf } from "./field.ts";
import { groupsOf, noteOn } from "./note.ts";
import type { Groups } from "./note.ts";
import type { Desk } from "./paste.ts";
import { pasteOn } from "./pasting.ts";
import type { Label, Ledger, SampleInfo } from "./placement.ts";
import { processingOf } from "./processing.ts";
import type { Processing } from "./processing.ts";
import { gridOf } from "./timing.ts";
import type { Grid } from "./timing.ts";

export interface Session {
  readonly samples: Readonly<Record<string, Float32Array>>;
  readonly table: Readonly<Record<string, SampleInfo>>;
  readonly seconds: number;
  readonly tempo: number;
  readonly swing: number;
  readonly labelOf: (sample: Float32Array) => Label;
  readonly log: Option.Option<Ledger>;
  readonly quiet: () => boolean;
}

const namesOf = ({ samples, table }: Session): ReadonlyMap<Float32Array, string> => {
  const names = new Map<Float32Array, string>();
  for (const name of Rec.keys(table)) {
    const sample = samples[name];
    if (Predicate.isNotUndefined(sample)) {
      names.set(sample, name);
    }
  }
  return names;
};

const deskOf = (session: Session): Desk => {
  const names = namesOf(session);
  return {
    frames: Math.ceil(session.seconds * SAMPLE_RATE),
    samples: session.samples,
    table: session.table,
    labelOf: (sample) => {
      const label = session.labelOf(sample);
      return { ...label, ...fieldOf("name")(names.get(sample) ?? label.name) };
    },
    log: session.log,
    quiet: session.quiet,
  };
};

export interface Studio extends Processing {
  readonly frames: number;
  readonly grid: Grid;
  readonly desk: Desk;
  readonly groups: Groups;
  readonly paste: ReturnType<typeof pasteOn>;
  readonly note: ReturnType<typeof noteOn>;
  readonly repeat: ReturnType<typeof repeatSlice>;
  readonly reverse: ReturnType<typeof reverseSlice>;
  readonly tapeStop: ReturnType<typeof tapeStop>;
}

export const studioOf = (session: Session): Studio => {
  const desk = deskOf(session);
  const groups = groupsOf(session.table);
  return {
    frames: desk.frames,
    grid: gridOf({ tempo: session.tempo, swing: session.swing }),
    desk,
    groups,
    paste: pasteOn(desk),
    note: noteOn({ desk, groups }),
    repeat: repeatSlice(desk),
    reverse: reverseSlice(desk),
    tapeStop: tapeStop(desk),
    ...processingOf(desk.frames),
  };
};
