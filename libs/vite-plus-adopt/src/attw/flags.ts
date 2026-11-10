import { Array as Arr } from "effect";

const EMPTY = 0;
const SET_BIT = 1;
const BINARY = 2;

const sharedFlags = (left: number, right: number): number => {
  if (left === EMPTY || right === EMPTY) {
    return EMPTY;
  }
  const lowest = Number(left % BINARY === SET_BIT && right % BINARY === SET_BIT);
  return lowest + BINARY * sharedFlags(Math.floor(left / BINARY), Math.floor(right / BINARY));
};

const hasFlag = (flags: number, mask: number): boolean => sharedFlags(flags, mask) !== EMPTY;

const withFlags = (flags: number, mask: number): number => flags + mask - sharedFlags(flags, mask);

const withoutFlags = (flags: number, mask: number): number => flags - sharedFlags(flags, mask);

const combineFlags = (...masks: readonly number[]): number => Arr.reduce(masks, EMPTY, withFlags);

export { EMPTY, combineFlags, hasFlag, withFlags, withoutFlags };
