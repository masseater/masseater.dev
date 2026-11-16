import { orDefault, semitoneRatio } from "#/entities/song/lib/dsp/number.ts";
import type { Point } from "#/entities/song/lib/dsp/shape.ts";
import { fieldOf } from "#/entities/song/lib/studio/field.ts";
import type { Source } from "#/entities/song/lib/studio/paste.ts";
import type { Placement } from "#/entities/song/lib/studio/placement.ts";

import { entryOf } from "./context.ts";
import type { Life } from "./context.ts";
import { wordOf } from "./words.ts";
import type { Syllable } from "./words.ts";

const ONE = 1;
const NONE = 0;
const SHORTEST_NOTE = 0.2;
const FAR = 1e9;
const CHOP = {
  prefer: 3,
  attack: 4e-3,
  release: 0.022,
  gain: 0.34,
  highPass: 180,
  shortest: 0.03,
  margin: 0.01,
};
const SAY = { gain: 0.36, highPass: 170, release: 0.02 };

export interface Sends {
  readonly send?: number;
  readonly delay?: number;
}

export interface Voicing extends Sends {
  readonly bus: string;
  readonly key: number;
  readonly time: number;
  readonly seconds: number;
  readonly gain?: number;
  readonly pan?: number;
  readonly highPass?: number;
  readonly lowPass?: number;
  readonly attack?: number;
  readonly release?: number;
}

export interface Chop extends Voicing {
  readonly voice: string;
  readonly prefer?: number;
  readonly skip?: number;
}

const sent = (
  life: Life,
  [source, time, placement]: readonly [Source, number, Placement],
  sends: Sends,
): void => {
  const gain = placement.gain ?? ONE;
  if ((sends.send ?? NONE) !== NONE) {
    life.studio.paste({
      bus: life.rack.get("PLATE SEND"),
      source,
      time,
      placement: { ...placement, gain: gain * (sends.send ?? NONE) },
    });
  }
  if ((sends.delay ?? NONE) !== NONE) {
    life.studio.paste({
      bus: life.rack.get("DELAY SEND"),
      source,
      time,
      placement: { ...placement, gain: gain * (sends.delay ?? NONE) },
    });
  }
};

type Sung = readonly [start: number, end: number, key: number];

interface Wanted {
  readonly voice: string;
  readonly key: number;
  readonly prefer: number;
}

const nearest = (life: Life, { voice, key: target, prefer }: Wanted): Sung => {
  let best: Sung = [NONE, NONE, NONE];
  let distance = FAR;
  for (const note of entryOf(life)(voice).notes ?? []) {
    const [start = NONE, end = NONE, key = NONE] = note;
    const away = Math.abs(target - key - prefer);
    if (end - start >= SHORTEST_NOTE && away < distance) {
      distance = away;
      best = [start, end, key];
    }
  }
  return best;
};

export const chop =
  (life: Life) =>
  (spec: Chop): void => {
    const [start, end, key] = nearest(life, {
      voice: spec.voice,
      key: spec.key,
      prefer: spec.prefer ?? CHOP.prefer,
    });
    const rate = semitoneRatio(spec.key - key);
    const offset = start + (spec.skip ?? NONE);
    const available = (end - offset) / rate;
    const placement: Placement = {
      midi: key,
      offset,
      rate,
      duration: Math.min(spec.seconds, Math.max(CHOP.shortest, available - CHOP.margin)),
      attack: spec.attack ?? CHOP.attack,
      release: spec.release ?? CHOP.release,
      gain: (spec.gain ?? ONE) * CHOP.gain,
      pan: orDefault(NONE)(spec.pan),
      highPass: orDefault(CHOP.highPass)(spec.highPass),
      ...fieldOf("lowPass")(spec.lowPass),
    };
    life.studio.paste({
      bus: life.rack.get(spec.bus),
      source: spec.voice,
      time: spec.time,
      placement,
    });
    sent(life, [spec.voice, spec.time, placement], spec);
  };

export interface Say extends Voicing {
  readonly syllable: string | Syllable;
  readonly mode?: string;
  readonly grain?: number;
  readonly source?: string;
  readonly label?: string;
  readonly pitch?: readonly Point[];
}

export const say =
  (life: Life) =>
  (spec: Say): void => {
    const sample = wordOf(life)({
      syllable: spec.syllable,
      key: spec.key,
      seconds: spec.seconds,
      ...fieldOf("mode")(spec.mode),
      ...fieldOf("grain")(spec.grain),
      ...fieldOf("source")(spec.source),
      ...fieldOf("label")(spec.label),
    });
    const placement: Placement = {
      gain: (spec.gain ?? ONE) * SAY.gain,
      pan: orDefault(NONE)(spec.pan),
      highPass: orDefault(SAY.highPass)(spec.highPass),
      release: orDefault(SAY.release)(spec.release),
      ...fieldOf("lowPass")(spec.lowPass),
      ...fieldOf("pitch")(spec.pitch),
    };
    life.studio.paste({ bus: life.rack.get(spec.bus), source: sample, time: spec.time, placement });
    sent(life, [sample, spec.time, placement], spec);
  };
