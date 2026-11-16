import { Array as Arr, pipe } from "effect";

import { STEPS_PER_BAR, barSeconds, normalized, songSeconds } from "#/entities/song/index.ts";
import type { Automation, Structure } from "#/entities/song/index.ts";

import type { Size } from "./pen.ts";
import type { Theme } from "./theme.ts";

const SHADE = { least: 0.02, most: 0.5, strength: 0.75 } as const;
const BAR = { step: 3, width: 2, least: 2, fill: 0.96 } as const;
const HEAD = 2;
const STRIDE = 16;
const BANDS = {
  count: 96,
  lowest: 30,
  ratio: 600,
  pad: 2,
  gamma: 2.2,
  floor: 0.35,
  range: 0.65,
} as const;
const BYTE = 255;
const NONE = 0;
const ONE = 1;
const TWO = 2;
const FULL = 1;
const HAIRLINE = 1;

export interface Shade {
  readonly seconds: number;
  readonly amount: number;
}

export interface Mix {
  readonly context: CanvasRenderingContext2D;
  readonly theme: Theme;
  readonly structure: Structure;
  readonly size: Size;
}

export interface Wave extends Mix {
  readonly peaks: Float32Array;
  readonly shades: readonly Shade[];
  readonly position: number;
}

export interface Spectrum extends Mix {
  readonly levels: Uint8Array;
  readonly sampleRate: number;
}

export interface Mixdown {
  readonly left: Float32Array;
  readonly right: Float32Array;
}

const shadesIn =
  (structure: Structure) =>
  (automation: Automation): readonly Shade[] => {
    const level = normalized(automation);
    const step = barSeconds(structure) / STEPS_PER_BAR;
    return pipe(
      Arr.fromIterable([...automation.values]),
      Arr.dropRight(ONE),
      Arr.map((value, index) => ({ seconds: index * step, amount: FULL - level(value) })),
      Arr.filter((shade) => shade.amount > SHADE.least),
    );
  };

export const shadesOf =
  (structure: Structure) =>
  (automation: readonly Automation[]): readonly Shade[] =>
    pipe(
      automation,
      Arr.filter((item) => item.shade),
      Arr.flatMap(shadesIn(structure)),
    );

const loudest = ({ left, right }: Mixdown, from: number, to: number): number => {
  let peak = NONE;
  for (let index = from; index < to; index += STRIDE) {
    peak = Math.max(peak, Math.abs(left[index] ?? NONE) + Math.abs(right[index] ?? NONE));
  }
  return Math.min(FULL, peak / TWO);
};

export const peaksOf =
  (width: number) =>
  (mixdown: Mixdown): Float32Array => {
    const frames = mixdown.left.length;
    return Float32Array.from({ length: width }, (_unused, column) =>
      loudest(
        mixdown,
        Math.floor((column * frames) / width),
        Math.floor(((column + ONE) * frames) / width),
      ),
    );
  };

const columnOf = ({ structure, size }: Mix, seconds: number): number =>
  (seconds / songSeconds(structure)) * size.width;

const shading = (wave: Wave): void => {
  const { context, theme, structure, size } = wave;
  const width = Math.ceil(columnOf(wave, barSeconds(structure) / STEPS_PER_BAR));
  context.fillStyle = theme.wall;
  for (const shade of wave.shades) {
    context.globalAlpha = Math.min(SHADE.most, shade.amount * SHADE.strength);
    context.fillRect(Math.floor(columnOf(wave, shade.seconds)), NONE, width, size.height);
  }
  context.globalAlpha = FULL;
};

const marks = (wave: Wave): void => {
  const { context, theme, structure, size } = wave;
  context.fillStyle = theme.line;
  for (const mark of structure.marks) {
    const left = Math.round(columnOf(wave, mark.bar * barSeconds(structure)));
    context.fillRect(left, NONE, HAIRLINE, size.height);
  }
};

const colorAt = ({ theme }: Wave, column: number, head: number): string => {
  if (column < head) {
    return theme.played;
  }
  return theme.wave;
};

const bars = (wave: Wave, head: number): void => {
  const { context, size, peaks } = wave;
  for (let column = NONE; column < size.width; column += BAR.step) {
    const height = Math.max(BAR.least, (peaks[column] ?? NONE) * size.height * BAR.fill);
    context.fillStyle = colorAt(wave, column, head);
    context.fillRect(column, (size.height - height) / TWO, BAR.width, height);
  }
};

const silence = ({ context, theme, size }: Wave): void => {
  context.fillStyle = theme.wave;
  context.fillRect(NONE, size.height / TWO, size.width, HAIRLINE);
};

export const drawWave = (wave: Wave): void => {
  const { context, theme, size } = wave;
  const head = Math.floor(columnOf(wave, wave.position));
  context.clearRect(NONE, NONE, size.width, size.height);
  shading(wave);
  marks(wave);
  if (wave.peaks.length === NONE) {
    silence(wave);
  } else {
    bars(wave, head);
  }
  context.fillStyle = theme.ink;
  context.fillRect(head, NONE, HEAD, size.height);
};

const binOf = ({ levels, sampleRate }: Spectrum, band: number): number => {
  const frequency = BANDS.lowest * BANDS.ratio ** (band / BANDS.count);
  return Math.floor((frequency / (sampleRate / TWO)) * levels.length);
};

const levelOf = (spectrum: Spectrum, band: number): number => {
  const from = binOf(spectrum, band);
  const to = Math.max(from + ONE, binOf(spectrum, band + ONE));
  return Math.max(NONE, ...spectrum.levels.subarray(from, to)) / BYTE;
};

export const drawSpectrum = (spectrum: Spectrum): void => {
  const { context, theme, size } = spectrum;
  const width = size.width / BANDS.count;
  context.clearRect(NONE, NONE, size.width, size.height);
  context.fillStyle = theme.hot;
  for (const band of Arr.range(NONE, BANDS.count - ONE)) {
    const level = levelOf(spectrum, band);
    const height = level ** BANDS.gamma * size.height;
    context.globalAlpha = BANDS.floor + BANDS.range * level;
    context.fillRect(
      band * width + BANDS.pad,
      size.height - height,
      width - BANDS.pad * TWO,
      height,
    );
  }
  context.globalAlpha = FULL;
};
