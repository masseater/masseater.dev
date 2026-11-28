import { String as Str } from "effect";

const RUBY = /\{(?<written>[^|{}]+)\|(?<read>[^{}]+)\}/gu;

export const writtenOf = (say: string): string => Str.replaceAll(RUBY, "$<written>")(say);

export const readOf = (say: string): string => Str.replaceAll(RUBY, "$<read>")(say);
