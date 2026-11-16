import type { LiveMix, Tape } from "@masseater.dev/daw-view";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { FIELD } from "#/entities/song/model/program.ts";

import type { Master, Session, Slot } from "./program/song.js";
import { engine, player } from "./session.ts";

export interface Mastering {
  readonly session: Session;
  readonly out: Master;
  readonly stems: readonly Slot[];
}

export const liveOf =
  ({ session, out, stems }: Mastering) =>
  (tape: Tape): LiveMix => ({
    tracks: session.tracks,
    player,
    init: { [FIELD.frames]: session.N, SR: engine.SR, stems, par: out.par, auto: out.auto },
    transfer: pipe(
      Rec.values(out.auto),
      Arr.map((curve) => curve.buffer),
    ),
    tape,
  });
