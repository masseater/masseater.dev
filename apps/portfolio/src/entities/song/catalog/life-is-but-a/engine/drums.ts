import type { Life } from "./context.ts";
import { pasteAt } from "./hits.ts";

const HALF = 0.5;
const KICK = {
  body: { gain: 0.95, duration: 0.33, release: 0.05 },
  click: { gain: 0.35, duration: 0.2, release: 0.04, lowPass: 2200 },
};
const CLAP = {
  lead: 4e-3,
  rattleLead: 9e-3,
  rattles: ["clr1", "clr2", "clr3"],
  body: { gain: 0.5, pan: -0.08, duration: 0.3, release: 0.08, highPass: 280 },
  rattle: { gain: 0.34, pan: 0.22, duration: 0.22, release: 0.06, highPass: 350 },
  snare: { gain: 0.3, semitones: 2, duration: 0.16, release: 0.05, highPass: 170 },
  send: { gain: 0.11, duration: 0.25, highPass: 500 },
};
const GHOST = {
  pair: 2,
  odd: 1,
  gain: 0.26,
  lowest: 3,
  spread: 3,
  duration: 0.09,
  release: 0.04,
  highPass: 260,
  pan: 0.12,
};
const HAT = {
  loud: 0.6,
  drift: 4e-3,
  gain: 0.3,
  floor: 0.9,
  swing: 0.2,
  pan: -0.18,
  panSwing: 0.1,
  placement: { semitones: 1, duration: 0.07, release: 0.03, highPass: 5200 },
};

export interface Struck {
  readonly bar: number;
  readonly step: number;
  readonly velocity: number;
}

export const kickAt =
  (life: Life) =>
  ({ bar, step, velocity }: Struck): void => {
    const time = life.grid.at(bar, step);
    life.kicks.add(time);
    const kick = pasteAt(life);
    kick("KICK", "k1")(time, { ...KICK.body, gain: KICK.body.gain * velocity });
    kick("KICK", "k3")(time, { ...KICK.click, gain: KICK.click.gain * velocity });
  };

export const clapAt =
  (life: Life) =>
  ({ bar, step, velocity }: Struck): void => {
    const time = life.grid.at(bar, step);
    const paste = pasteAt(life);
    paste("DRUMS", "cl1")(time - CLAP.lead, { ...CLAP.body, gain: CLAP.body.gain * velocity });
    const rattle = CLAP.rattles[(bar + step) % CLAP.rattles.length] ?? "";
    paste("DRUMS", rattle)(time - CLAP.rattleLead, {
      ...CLAP.rattle,
      gain: CLAP.rattle.gain * velocity,
    });
    paste("DRUMS", "sn1")(time, { ...CLAP.snare, gain: CLAP.snare.gain * velocity });
    paste("PLATE SEND", "cl1")(time, { ...CLAP.send, gain: CLAP.send.gain * velocity });
  };

const ghostSample = (step: number): string => {
  if (step % GHOST.pair === GHOST.odd) {
    return "sn2";
  }
  return "sn1";
};

export const ghostAt =
  (life: Life) =>
  ({ bar, step, velocity }: Struck): void => {
    pasteAt(life)("DRUMS", ghostSample(step))(life.grid.at(bar, step), {
      gain: GHOST.gain * velocity,
      semitones: GHOST.lowest + (step % GHOST.spread),
      duration: GHOST.duration,
      release: GHOST.release,
      highPass: GHOST.highPass,
      pan: GHOST.pan,
    });
  };

const hatSample = (velocity: number): string => {
  if (velocity > HAT.loud) {
    return "ch2";
  }
  return "ch1";
};

export const hatAt =
  (life: Life) =>
  ({ bar, step, velocity }: Struck): void => {
    const drift = life.random();
    const time = life.grid.at(bar, step) + (drift - HALF) * HAT.drift;
    const gain = HAT.gain * velocity * (HAT.floor + HAT.swing * life.random());
    const pan = HAT.pan + HAT.panSwing * life.random();
    pasteAt(life)("DRUMS", hatSample(velocity))(time, { gain, pan, ...HAT.placement });
  };
