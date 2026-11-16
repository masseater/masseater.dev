import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { orDefault } from "#/entities/song/lib/dsp/number.ts";

import type { Bus } from "./bus.ts";
import type { Desk } from "./paste.ts";
import { pasteOn } from "./pasting.ts";
import type { Placement, SampleInfo } from "./placement.ts";

const SILENT = 0;

export interface Pitched {
  readonly name: string;
  readonly key: number;
}

export type Groups = Readonly<Record<string, readonly Pitched[]>>;

export const groupsOf = (table: Readonly<Record<string, SampleInfo>>): Groups => {
  const groups: Record<string, Pitched[]> = {};
  for (const [name, info] of Rec.toEntries(table)) {
    const group = info.group ?? "";
    if (group !== "") {
      const members = groups[group] ?? [];
      members.push({ name, key: info.key ?? info.midi ?? Number.NaN });
      groups[group] = members;
    }
  }
  return groups;
};

export interface Note {
  readonly bus: Bus;
  readonly group: string;
  readonly key: number;
  readonly time: number;
  readonly placement: Placement;
}

const nearest = (members: readonly Pitched[], key: number): Option.Option<Pitched> =>
  pipe(
    Arr.head(members),
    Option.map((first) =>
      Arr.reduce(members, first, (best, member) => {
        if (Math.abs(member.key - key) < Math.abs(best.key - key)) {
          return member;
        }
        return best;
      }),
    ),
  );

export const noteOn =
  ({ desk, groups }: Readonly<{ desk: Desk; groups: Groups }>) =>
  ({ bus, group, key, time, placement }: Note): void => {
    const best = Option.getOrThrow(nearest(groups[group] ?? [], key));
    pasteOn(desk)({
      bus,
      source: Option.getOrThrow(Option.fromUndefinedOr(desk.samples[best.name])),
      time,
      placement: {
        ...placement,
        semitones: orDefault(SILENT)(placement.semitones) + (key - best.key),
      },
    });
  };
