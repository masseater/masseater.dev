import { orDefault } from "#/entities/song/lib/dsp/number.ts";
import { fieldOf } from "#/entities/song/lib/studio/field.ts";

import type { Life } from "./context.ts";
import { keyShiftOf } from "./harmony.ts";
import { chop } from "./voices.ts";
import type { Chop } from "./voices.ts";

const ONE = 1;
const NONE = 0;
const LEAD = {
  voice: "v_f2_belt",
  bus: "VOICES",
  cut: 0.5,
  long: 3,
  pair: 2,
  half: 0.5,
  firstLong: 0.86,
  restLong: 0.94,
  quieter: 0.95,
  skipLong: 0.02,
  firstPair: 0.8,
  restPair: 0.9,
  softer: 0.8,
  skipPair: 0.06,
  whole: 0.93,
};

export interface Sung {
  readonly step: number;
  readonly length: number;
  readonly key: number;
}

export interface Lead {
  readonly bar: number;
  readonly notes: readonly Sung[];
  readonly cut?: number;
  readonly send?: number;
  readonly delay?: number;
  readonly voice?: string;
  readonly transpose?: number;
  readonly pan?: number;
  readonly gain?: number;
  readonly prefer?: number;
  readonly bus?: string;
}

interface Phrase {
  readonly lead: Lead;
  readonly note: Sung;
  readonly last: boolean;
}

const baseOf = ({ lead, note }: Phrase): Omit<Chop, "time" | "seconds" | "gain"> => ({
  bus: lead.bus ?? LEAD.bus,
  voice: lead.voice ?? LEAD.voice,
  key: note.key + (keyShiftOf(lead.bar) + orDefault(NONE)(lead.transpose)),
  ...fieldOf("pan")(lead.pan),
  ...fieldOf("prefer")(lead.prefer),
});

type Style = (life: Life, phrase: Phrase, span: readonly [number, number]) => void;

const split: Style = (life, phrase, [time, full]) => {
  const { lead, note } = phrase;
  const first = life.grid.at(lead.bar, note.step + ONE) - time;
  const base = { ...baseOf(phrase), ...fieldOf("send")(lead.send) };
  const gain = orDefault(ONE)(lead.gain);
  chop(life)({ ...base, time, seconds: first * LEAD.firstLong, gain: gain * LEAD.quieter });
  chop(life)({
    ...base,
    time: time + first,
    seconds: (full - first) * LEAD.restLong,
    gain,
    ...fieldOf("delay")(lead.delay),
    skip: LEAD.skipLong,
  });
};

const paired: Style = (life, phrase, [time, full]) => {
  const { lead } = phrase;
  const first = full / LEAD.pair;
  const base = baseOf(phrase);
  const gain = orDefault(ONE)(lead.gain);
  chop(life)({
    ...base,
    ...fieldOf("send")(lead.send),
    time,
    seconds: first * LEAD.firstPair,
    gain,
  });
  chop(life)({
    ...base,
    time: time + first,
    seconds: first * LEAD.restPair,
    gain: gain * LEAD.softer,
    skip: LEAD.skipPair,
  });
};

const lastDelayOf = (lead: Lead, last: boolean): number => {
  if (last) {
    return lead.delay ?? NONE;
  }
  return NONE;
};

const whole: Style = (life, phrase, [time, full]) => {
  const { lead, last } = phrase;
  chop(life)({
    ...baseOf(phrase),
    ...fieldOf("send")(lead.send),
    time,
    seconds: full * LEAD.whole,
    gain: orDefault(ONE)(lead.gain),
    delay: lastDelayOf(lead, last),
  });
};

const styleOf = ({ lead, note }: Phrase, chance: number): Style => {
  const cut = lead.cut ?? LEAD.cut;
  if (note.length >= LEAD.long && chance < cut) {
    return split;
  }
  if (note.length === LEAD.pair && chance < cut * LEAD.half) {
    return paired;
  }
  return whole;
};

const sung = (life: Life, phrase: Phrase): void => {
  const { lead, note } = phrase;
  const time = life.grid.at(lead.bar, note.step);
  const full = life.grid.at(lead.bar, note.step + note.length) - time;
  styleOf(phrase, life.random())(life, phrase, [time, full]);
};

export const lead =
  (life: Life) =>
  (spec: Lead): void => {
    for (const [index, note] of spec.notes.entries()) {
      sung(life, { lead: spec, note, last: index === spec.notes.length - ONE });
    }
  };
