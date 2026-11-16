import { Option, String as Str, pipe } from "effect";

import type { Tone } from "./song.ts";

const DEGREES = 360;
const HALF_TURN = 180;
const CUBE = 3;
const CHANNEL_MAX = 255;
const DARK = 0;
const LIGHT = 1;
const LINEAR_LIMIT = 0.0031308;
const LINEAR_GAIN = 12.92;
const GAMMA_GAIN = 1.055;
const GAMMA = 2.4;
const GAMMA_OFFSET = 0.055;
const HASH_SEED = 7;
const HASH_FACTOR = 31;
const FIRST = 0;
const FAINT_CHROMA = 0.45;
const FULL_CHROMA = 1;
const GOLDEN_ANGLE = 137.5;
const SHADES = 3;
const SHADE_CENTER = 1;
const SHADE_STEP = 0.045;

const CONES = {
  long: { green: 0.3963377774, blue: 0.2158037573 },
  medium: { green: -0.1055613458, blue: -0.0638541728 },
  short: { green: -0.0894841775, blue: -1.291485548 },
} as const;

const CHANNELS = {
  red: { long: 4.0767416621, medium: -3.3077115913, short: 0.2309699292 },
  green: { long: -1.2684380046, medium: 2.6097574011, short: -0.3413193965 },
  blue: { long: -0.0041960863, medium: -0.7034186147, short: 1.707614701 },
} as const;

interface Oklch {
  readonly lightness: number;
  readonly chroma: number;
  readonly hue: number;
}

export interface Tint {
  readonly lightness: number;
  readonly chroma: number;
  readonly ink: string;
}

interface Lab {
  readonly lightness: number;
  readonly green: number;
  readonly blue: number;
}

interface Cones {
  readonly long: number;
  readonly medium: number;
  readonly short: number;
}

const encoded = (linear: number): number => {
  const value = Math.min(LIGHT, Math.max(DARK, linear));
  if (value <= LINEAR_LIMIT) {
    return Math.round(CHANNEL_MAX * LINEAR_GAIN * value);
  }
  return Math.round(CHANNEL_MAX * (GAMMA_GAIN * value ** (LIGHT / GAMMA) - GAMMA_OFFSET));
};

const cone = (lab: Lab, weights: Readonly<{ green: number; blue: number }>): number =>
  (lab.lightness + weights.green * lab.green + weights.blue * lab.blue) ** CUBE;

const channel = (cones: Cones, weights: Cones): number =>
  encoded(weights.long * cones.long + weights.medium * cones.medium + weights.short * cones.short);

const labOf = ({ lightness, chroma, hue }: Oklch): Lab => {
  const angle = (hue * Math.PI) / HALF_TURN;
  return { lightness, green: chroma * Math.cos(angle), blue: chroma * Math.sin(angle) };
};

const oklch = (color: Oklch): string => {
  const lab = labOf(color);
  const cones = {
    long: cone(lab, CONES.long),
    medium: cone(lab, CONES.medium),
    short: cone(lab, CONES.short),
  };
  const red = channel(cones, CHANNELS.red);
  const green = channel(cones, CHANNELS.green);
  const blue = channel(cones, CHANNELS.blue);
  return `rgb(${red},${green},${blue})`;
};

const codeOf = (character: string): number =>
  pipe(
    character,
    Str.codePointAt(FIRST),
    Option.getOrElse(() => FIRST),
  );

export const nameHue = (name: string): number => {
  let hash = HASH_SEED;
  for (const character of name) {
    hash = (hash * HASH_FACTOR + codeOf(character)) % DEGREES;
  }
  return hash;
};

const chromaOf = (tone: Tone): number => {
  if (tone === "faint") {
    return FAINT_CHROMA;
  }
  return FULL_CHROMA;
};

export const trackColor =
  (tint: Tint) =>
  ({ hue, tone }: Readonly<{ hue: number; tone: Tone }>): string => {
    if (tone === "ink") {
      return tint.ink;
    }
    return oklch({ lightness: tint.lightness, chroma: tint.chroma * chromaOf(tone), hue });
  };

export const sampleColor =
  (tint: Tint) =>
  ({ hue, index }: Readonly<{ hue: number; index: number }>): string =>
    oklch({
      lightness: tint.lightness + ((index % SHADES) - SHADE_CENTER) * SHADE_STEP,
      chroma: tint.chroma,
      hue: (hue + index * GOLDEN_ANGLE) % DEGREES,
    });
