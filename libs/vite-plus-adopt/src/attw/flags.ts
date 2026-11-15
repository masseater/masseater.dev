import { Array as Arr, Function as Fn } from "effect";

const DATA_FIRST_ARITY = 2;

export const EMPTY = 0;
const SET_BIT = 1;
const BINARY = 2;

const sharedFlags = (left: number, right: number): number => {
  if (left === EMPTY || right === EMPTY) {
    return EMPTY;
  }
  const lowest = Number(left % BINARY === SET_BIT && right % BINARY === SET_BIT);
  return lowest + BINARY * sharedFlags(Math.floor(left / BINARY), Math.floor(right / BINARY));
};

export const hasFlag: {
  (mask: number): (flags: number) => boolean;
  (flags: number, mask: number): boolean;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (flags: number, mask: number): boolean => sharedFlags(flags, mask) !== EMPTY,
);

export const withFlags: {
  (mask: number): (flags: number) => number;
  (flags: number, mask: number): number;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (flags: number, mask: number): number => flags + mask - sharedFlags(flags, mask),
);

export const withoutFlags: {
  (mask: number): (flags: number) => number;
  (flags: number, mask: number): number;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (flags: number, mask: number): number => flags - sharedFlags(flags, mask),
);

export const combineFlags = (...masks: readonly number[]): number =>
  Arr.reduce(masks, EMPTY, withFlags);
