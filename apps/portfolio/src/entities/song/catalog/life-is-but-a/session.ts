import type { Samples } from "@masseater.dev/daw-view";

import type { Progressing } from "#/entities/song/model/program.ts";

import { engineModule } from "./program/engine.js";
import { mixerModule } from "./program/mixer.js";
import { songModule } from "./program/song.js";
import type { Mastered, Rendering } from "./program/song.js";
import table from "./samples.json";

const SECONDS_PER_BAR_AT_ONE_BPM = 240;

export const engine = engineModule();

export const program = songModule();

export const player = `(init, rate, tape) => new ((${String(mixerModule)})().Player)(init, rate, tape)`;

export const frames = Math.ceil(
  ((program.BARS * SECONDS_PER_BAR_AT_ONE_BPM) / program.BPM + program.TAIL) * engine.SR,
);

export const masteredOn: (
  rendering: Rendering,
) => (samples: Samples, progress: Progressing) => Promise<Mastered> =
  (rendering) => (samples, progress) =>
    program.render(engine, samples, table, progress, rendering);
