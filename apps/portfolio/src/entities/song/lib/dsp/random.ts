const WORD = 4_294_967_296;
const HALF_WORD = 2_147_483_648;
const BYTE = 256;
const BYTES = 4;
const BIT = 2;
const BITS = 8;
const ZERO = 0;
const ONE = 1;
const INCREMENT = 1_831_565_813;
const SHIFTS = { first: 15, second: 7, third: 14 } as const;
const MIX = 61;
const LOW_BITS = 64;

const unsigned = (value: number): number => ((value % WORD) + WORD) % WORD;

const signed = (value: number): number => {
  const word = unsigned(value);
  if (word >= HALF_WORD) {
    return word - WORD;
  }
  return word;
};

const bitAt = (value: number, bit: number): number => Math.floor(value / BIT ** bit) % BIT;

const byteXor = (left: number, right: number): number => {
  let result = ZERO;
  for (let bit = ZERO; bit < BITS; bit += ONE) {
    if (bitAt(left, bit) !== bitAt(right, bit)) {
      result += BIT ** bit;
    }
  }
  return result;
};

const byteOr = (left: number, right: number): number => {
  let result = ZERO;
  for (let bit = ZERO; bit < BITS; bit += ONE) {
    if (bitAt(left, bit) === ONE || bitAt(right, bit) === ONE) {
      result += BIT ** bit;
    }
  }
  return result;
};

const XOR = Uint8Array.from({ length: BYTE * BYTE }, (_unused, index) =>
  byteXor(Math.floor(index / BYTE), index % BYTE),
);

const MIXED = Uint8Array.from({ length: LOW_BITS }, (_unused, index) => byteOr(index, MIX));

const xor = (left: number, right: number): number => {
  const leftWord = unsigned(left);
  const rightWord = unsigned(right);
  let result = ZERO;
  for (let place = ZERO; place < BYTES; place += ONE) {
    const scale = BYTE ** place;
    const pair =
      (Math.floor(leftWord / scale) % BYTE) * BYTE + (Math.floor(rightWord / scale) % BYTE);
    result += (XOR[pair] ?? ZERO) * scale;
  }
  return result;
};

const shiftedRight = (value: number, bits: number): number =>
  Math.floor(unsigned(value) / BIT ** bits);

const oddOf = (value: number): number => {
  const word = unsigned(value);
  return word + ONE - (word % BIT);
};

const mixedOf = (value: number): number => {
  const word = unsigned(value);
  const low = word % LOW_BITS;
  return word - low + (MIXED[low] ?? ZERO);
};

const scrambled = (state: number): number => {
  const first = Math.imul(xor(state, shiftedRight(state, SHIFTS.first)), oddOf(state));
  const folded = Math.imul(xor(first, shiftedRight(first, SHIFTS.second)), mixedOf(first));
  const second = xor(signed(first + folded), first);
  return xor(second, shiftedRight(second, SHIFTS.third)) / WORD;
};

export const randomFrom = (seed: number): (() => number) => {
  let state = signed(unsigned(seed));
  return () => {
    state = signed(state + INCREMENT);
    return scrambled(state);
  };
};
