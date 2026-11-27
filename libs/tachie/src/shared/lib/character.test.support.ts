import { readPsd, writePsd } from "ag-psd";
import type { Layer, Psd } from "ag-psd";
import { Array as Arr } from "effect";

const SIZE = 64;

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const FULL: Rect = { x: 0, y: 0, width: SIZE, height: SIZE };

const painted = (color: string, rect: Rect): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (context !== null) {
    context.fillStyle = color;
    context.fillRect(rect.x, rect.y, rect.width, rect.height);
  }
  return canvas;
};

const pixels = (
  name: string,
  color: string,
  options: Readonly<{ rect?: Rect; hidden?: boolean; clipping?: boolean }> = {},
): Layer => ({
  name,
  left: 0,
  top: 0,
  hidden: options.hidden === true,
  clipping: options.clipping === true,
  blendMode: "normal",
  opacity: 1,
  canvas: painted(color, options.rect ?? FULL),
});

const group = (name: string, children: readonly Layer[], hidden = false): Layer => ({
  name,
  hidden,
  opened: true,
  children: [...children],
});

const EYE = { x: 20, y: 16, width: 24, height: 8 };
const MOUTH = { x: 24, y: 40, width: 16, height: 8 };

export const characterPsd = (): Psd => ({
  width: SIZE,
  height: SIZE,
  children: [
    pixels("体", "#c0c0c0", { rect: { x: 8, y: 8, width: 48, height: 52 } }),
    pixels("体:flipx", "#808000", { rect: { x: 8, y: 8, width: 24, height: 52 }, hidden: true }),
    pixels("影", "#004000", { rect: { x: 0, y: 48, width: SIZE, height: 16 }, clipping: true }),
    group("!目", [
      pixels("*閉じ", "#000000", { rect: { ...EYE, y: 20, height: 2 }, hidden: true }),
      pixels("*半目", "#202080", { rect: { ...EYE, y: 18, height: 4 }, hidden: true }),
      pixels("*開き", "#2020ff", { rect: EYE }),
    ]),
    group("!口", [
      pixels("*ん", "#400000", { rect: { ...MOUTH, y: 43, height: 2 } }),
      pixels("*あ", "#ff0000", { rect: MOUTH, hidden: true }),
      pixels("*い", "#ff8000", { rect: { ...MOUTH, y: 42, height: 4 }, hidden: true }),
      pixels("*う", "#ff00ff", { rect: { ...MOUTH, x: 28, width: 8 }, hidden: true }),
      pixels("*え", "#ffff00", { rect: { ...MOUTH, y: 41, height: 6 }, hidden: true }),
      pixels("*お", "#00ffff", { rect: { ...MOUTH, x: 26, width: 12 }, hidden: true }),
    ]),
    group(
      "眉",
      [
        pixels("飾り", "#00ff00", { rect: { x: 0, y: 0, width: 8, height: 8 } }),
        pixels("飾り", "#0000ff", { rect: { x: 56, y: 0, width: 8, height: 8 }, hidden: true }),
        pixels("*普通", "#603000", { rect: { ...EYE, y: 10, height: 2 } }),
        pixels("*困り", "#603000", { rect: { ...EYE, y: 8, height: 4 }, hidden: true }),
      ],
      true,
    ),
  ],
});

export const characterBytes = (): ArrayBuffer => writePsd(characterPsd());

export const characterRoundTrip = (): Psd => readPsd(characterBytes(), { skipThumbnail: true });

export const CHARACTER_FAVORITES = Arr.join("\n")([
  "[PSDToolFavorites-v1]",
  "root-name/%E3%81%8A%E6%B0%97%E3%81%AB%E5%85%A5%E3%82%8A",
  "",
  "//*表情/目口~filter",
  "!目",
  "!目/*閉じ",
  "!目/*半目",
  "!目/*開き",
  "!口",
  "!口/*ん",
  "!口/*あ",
  "",
  "//*表情/目口/笑う",
  "!目/*閉じ",
  "!口/*あ",
  "",
  "//*表情/目口/普通",
  "!目/*開き",
  "!口/*ん",
  "",
  "//困り顔",
  "体",
  "眉/*困り",
  "!目/*半目",
  "!口/*ん",
  "",
]);
