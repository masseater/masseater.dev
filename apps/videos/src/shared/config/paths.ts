import { String as Str } from "effect";

const CACHE_DIR = "cache";
export const NARRATION_MANIFEST = `${CACHE_DIR}/narration.json`;

const UNSAFE = /[^a-zA-Z0-9.]+/gu;
const SAFE = "_";

export const tachiePath = (name: string): string => `${CACHE_DIR}/tachie/${name}.png`;

export const narrationPath = (key: string): string => `${CACHE_DIR}/narration/${key}.wav`;

export const assetPath = (url: string): string => {
  const { hostname, pathname } = new URL(url);
  return `${CACHE_DIR}/assets/${Str.replaceAll(UNSAFE, SAFE)(`${hostname}${pathname}`)}`;
};
