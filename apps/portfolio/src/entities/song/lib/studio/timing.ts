import { orDefault } from "#/entities/song/lib/dsp/number.ts";

const SECONDS_PER_MINUTE = 60;
const STEPS_PER_BEAT = 4;
const STEPS_PER_BAR = 16;
const LAST_STEP = 15;
const PAIR = 2;
const NEXT = 1;
const SILENT = 0;

export interface Feel {
  readonly tempo: number;
  readonly swing: number;
}

export interface Grid {
  readonly sixteenth: number;
  readonly bar: number;
  readonly at: (bar: number, step?: number) => number;
}

const offbeat = (sixteenth: number, swing: number, step: number): number => {
  if (step % PAIR === NEXT) {
    return PAIR * sixteenth * swing;
  }
  return SILENT;
};

const startOf =
  ({ sixteenth, swing }: Readonly<{ sixteenth: number; swing: number }>) =>
  (step: number): number =>
    Math.floor(step / PAIR) * PAIR * sixteenth + offbeat(sixteenth, swing, step);

export const gridOf = ({ tempo, swing }: Feel): Grid => {
  const sixteenth = SECONDS_PER_MINUTE / tempo / STEPS_PER_BEAT;
  const bar = sixteenth * STEPS_PER_BAR;
  const start = startOf({ sixteenth, swing });
  const endOf = (step: number): number => {
    if (step === LAST_STEP) {
      return bar;
    }
    return start(step + NEXT);
  };
  return {
    sixteenth,
    bar,
    at: (at, step) => {
      const given = orDefault(SILENT)(step);
      const carried = Math.floor(given / STEPS_PER_BAR);
      const within = given - carried * STEPS_PER_BAR;
      const whole = Math.floor(within);
      const from = start(whole);
      return (at + carried) * bar + from + (endOf(whole) - from) * (within - whole);
    },
  };
};
