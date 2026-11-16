import type { Samples } from "@masseater.dev/daw-view";

import type { Sheet } from "#/entities/song/model/take.ts";

import { engineModule } from "./program/engine.js";
import { mixerModule } from "./program/mixer.js";
import { songModule } from "./program/song.js";
import type { Session } from "./program/song.js";
import table from "./samples.json";

export const engine = engineModule();

export const program = songModule();

export const player = `(init, rate, tape) => new ((${String(mixerModule)})().Player)(init, rate, tape)`;

export const openedOn: (sheet: Sheet) => (samples: Samples) => Session =
  ({ log, view }) =>
  (samples) =>
    program.open(engine, samples, table, { log, view, mix: mixerModule() });
