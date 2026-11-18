import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import type { Bus } from "#/shared/lib/studio/bus.ts";
import type { Desk } from "#/shared/lib/studio/paste.ts";
import { pasteOn } from "#/shared/lib/studio/pasting.ts";
import type { Ledger, Logged } from "#/shared/lib/studio/placement.ts";

import type { Send } from "./params.ts";
import type { Placed } from "./placements.ts";
import { routesOf } from "./routes.ts";

const EXTENSION = /\.[a-z0-9]+$/u;
const ONE = 1;
const UNNAMED = "";

export type Samples = Readonly<Record<string, Float32Array>>;

const sampleName = (path: string): string =>
  pipe(
    Str.lastIndexOf("/")(path),
    Option.match({ onNone: () => path, onSome: (slash) => Str.slice(slash + ONE)(path) }),
    Str.replace(EXTENSION, ""),
  );

export const deskOf =
  (frames: number) =>
  (samples: Samples) =>
  (log: Ledger): Desk => {
    const names = new Map(
      pipe(
        Rec.toEntries(samples),
        Arr.map(([name, sample]): readonly [Float32Array, string] => [sample, sampleName(name)]),
      ),
    );
    return {
      frames,
      samples,
      table: {},
      labelOf: (sample) => ({ name: names.get(sample) ?? UNNAMED }),
      log: Option.some(log),
      quiet: () => false,
    };
  };

export const pasted =
  (desk: Desk) =>
  (buses: ReadonlyMap<string, Bus>) =>
  (bus: Bus) =>
  (placed: Placed): void => {
    const paste = pasteOn(desk);
    paste({ bus, source: placed.sample, time: placed.time, placement: placed.placement });
    for (const { into, amount } of routesOf(buses)(placed.sends)) {
      paste({
        bus: { ...into, name: UNNAMED },
        source: placed.sample,
        time: placed.time,
        placement: { ...placed.placement, gain: (placed.placement.gain ?? ONE) * amount },
      });
    }
  };

export const loggedWithSends =
  (log: Ledger) =>
  (held: readonly Logged[]) =>
  (sends: readonly Send[]): void => {
    log.push(...held);
    for (const send of sends) {
      for (const entry of held) {
        log.push({ ...entry, track: send.bus, gain: entry.gain * send.amount });
      }
    }
  };
