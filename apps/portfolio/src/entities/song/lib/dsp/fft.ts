import { Option } from "effect";

const ONE = 1;
const TWO = 2;
const FIRST = 0;
const STEP = 1;
const SILENT = 0;

const reversedIndex = (index: number, size: number): number => {
  let result = FIRST;
  let rest = index;
  for (let bit = size / TWO; bit >= ONE; bit /= TWO) {
    result += (rest % TWO) * bit;
    rest = Math.floor(rest / TWO);
  }
  return result;
};

const swapsOf = (size: number): Int32Array => {
  const pairs: number[] = [];
  for (let index = ONE; index < size; index += STEP) {
    const partner = reversedIndex(index, size);
    if (index < partner) {
      pairs.push(index, partner);
    }
  }
  return Int32Array.from(pairs);
};

const stageTwiddles = (table: Float64Array, half: number, sign: number): void => {
  const angle = ((TWO * Math.PI) / (half * TWO)) * sign;
  const wr = Math.cos(angle);
  const wi = Math.sin(angle);
  let cr = ONE;
  let ci = SILENT;
  for (let offset = FIRST; offset < half; offset += STEP) {
    table.set([cr, ci], (half - ONE + offset) * TWO);
    const turned = cr * wr - ci * wi;
    ci = cr * wi + ci * wr;
    cr = turned;
  }
};

const twiddlesOf = (size: number, sign: number): Float64Array => {
  const table = new Float64Array(size * TWO);
  for (let half = ONE; half < size; half *= TWO) {
    stageTwiddles(table, half, sign);
  }
  return table;
};

interface Plan {
  readonly swaps: Int32Array;
  readonly forward: Float64Array;
  readonly backward: Float64Array;
}

const plans = new Map<number, Plan>();

const planOf = (size: number): Plan =>
  Option.getOrElse(Option.fromUndefinedOr(plans.get(size)), () => {
    const plan = {
      swaps: swapsOf(size),
      forward: twiddlesOf(size, -ONE),
      backward: twiddlesOf(size, ONE),
    };
    plans.set(size, plan);
    return plan;
  });

const swapped = (values: Float64Array, left: number, right: number): void => {
  const held = values[left] ?? SILENT;
  values[left] = values[right] ?? SILENT;
  values[right] = held;
};

export interface Spectrum {
  readonly real: Float64Array;
  readonly imaginary: Float64Array;
}

const reordered = ({ real, imaginary }: Spectrum, swaps: Int32Array): void => {
  for (let index = FIRST; index < swaps.length; index += TWO) {
    const left = swaps[index] ?? FIRST;
    const right = swaps[index + ONE] ?? FIRST;
    swapped(real, left, right);
    swapped(imaginary, left, right);
  }
};

interface Stage extends Spectrum {
  readonly twiddles: Float64Array;
  readonly product: Float64Array;
  readonly half: number;
}

const rotated = ({ real, imaginary, twiddles, product }: Stage, high: number, at: number): void => {
  const cr = twiddles[at] ?? SILENT;
  const ci = twiddles[at + ONE] ?? SILENT;
  const highReal = real[high] ?? SILENT;
  const highImaginary = imaginary[high] ?? SILENT;
  product[FIRST] = highReal * cr - highImaginary * ci;
  product[ONE] = highReal * ci + highImaginary * cr;
};

const crossed = (current: Stage, start: number, offset: number): void => {
  const { real, imaginary, product, half } = current;
  const low = start + offset;
  const high = low + half;
  rotated(current, high, (half - ONE + offset) * TWO);
  const xr = product[FIRST] ?? SILENT;
  const xi = product[ONE] ?? SILENT;
  real[high] = (real[low] ?? SILENT) - xr;
  imaginary[high] = (imaginary[low] ?? SILENT) - xi;
  real[low] = (real[low] ?? SILENT) + xr;
  imaginary[low] = (imaginary[low] ?? SILENT) + xi;
};

const stage = (current: Stage): void => {
  const size = current.real.length;
  for (let start = FIRST; start < size; start += current.half * TWO) {
    for (let offset = FIRST; offset < current.half; offset += STEP) {
      crossed(current, start, offset);
    }
  }
};

const scaled = (values: Float64Array): void => {
  for (let index = FIRST; index < values.length; index += STEP) {
    values[index] = (values[index] ?? SILENT) / values.length;
  }
};

const twiddlesFor = (plan: Plan, inverse: boolean): Float64Array => {
  if (inverse) {
    return plan.backward;
  }
  return plan.forward;
};

export const fft =
  (inverse: boolean) =>
  (spectrum: Spectrum): void => {
    const size = spectrum.real.length;
    const plan = planOf(size);
    reordered(spectrum, plan.swaps);
    const twiddles = twiddlesFor(plan, inverse);
    const product = new Float64Array(TWO);
    for (let half = ONE; half < size; half *= TWO) {
      stage({ ...spectrum, twiddles, product, half });
    }
    if (inverse) {
      scaled(spectrum.real);
      scaled(spectrum.imaginary);
    }
  };
