const SECONDS_PER_MINUTE = 60;
const BEATS_PER_BAR = 4;
const PAIR = 2;
const NO_OFFSET = 0;
const FULL = 1;

export const STEPS_PER_BAR = 16;
export const STEPS_PER_BEAT = 4;

export interface Section {
  readonly name: string;
  readonly from: number;
  readonly to: number;
}

export interface Mark {
  readonly bar: number;
  readonly label: string;
}

export type Tone = "full" | "faint" | "ink";

export interface TrackStyle {
  readonly name: string;
  readonly hue: number;
  readonly tone: Tone;
}

export interface GlidePoint {
  readonly at: number;
  readonly semitones: number;
}

export interface Placement {
  readonly track: string;
  readonly sample: string;
  readonly start: number;
  readonly duration: number;
  readonly gain: number;
  readonly offset: number;
  readonly reversed: boolean;
}

export interface Hit extends Placement {
  readonly kind: "hit";
}

export interface Note extends Placement {
  readonly kind: "note";
  readonly pitch: number;
  readonly glide: readonly GlidePoint[];
}

export type NoteEvent = Hit | Note;

export type Scale = "linear" | "log";

export interface Automation {
  readonly name: string;
  readonly values: readonly number[];
  readonly low: number;
  readonly high: number;
  readonly scale: Scale;
  readonly unit: "Hz" | "level";
  readonly shade: boolean;
}

export interface Take {
  readonly events: readonly NoteEvent[];
  readonly automation: readonly Automation[];
  readonly roots: readonly number[];
}

export interface Timing {
  readonly tempo: number;
  readonly swing: number;
  readonly bars: number;
  readonly tail: number;
}

export interface Structure extends Timing {
  readonly sections: readonly Section[];
  readonly marks: readonly Mark[];
  readonly tracks: readonly TrackStyle[];
}

export interface Step {
  readonly bar: number;
  readonly step: number;
}

export const barSeconds = (timing: Timing): number =>
  (SECONDS_PER_MINUTE * BEATS_PER_BAR) / timing.tempo;

export const songSeconds = (timing: Timing): number =>
  timing.bars * barSeconds(timing) + timing.tail;

export const totalBars = (timing: Timing): number => songSeconds(timing) / barSeconds(timing);

const swung = (timing: Timing, step: number): number => {
  if (step % PAIR === NO_OFFSET) {
    return NO_OFFSET;
  }
  return timing.swing * PAIR;
};

export const stepBars =
  (timing: Timing) =>
  ({ bar, step }: Step): number =>
    bar + (Math.floor(step / PAIR) * PAIR + swung(timing, step)) / STEPS_PER_BAR;

export const EMPTY_TAKE: Take = { events: [], automation: [], roots: [] };

const linear = ({ low, high }: Automation, value: number): number => (value - low) / (high - low);

const logarithmic = ({ low, high }: Automation, value: number): number =>
  Math.log(Math.max(value, low) / low) / Math.log(high / low);

export const normalized =
  (automation: Automation) =>
  (value: number): number => {
    if (automation.scale === "log") {
      return Math.min(FULL, Math.max(NO_OFFSET, logarithmic(automation, value)));
    }
    return Math.min(FULL, Math.max(NO_OFFSET, linear(automation, value)));
  };
