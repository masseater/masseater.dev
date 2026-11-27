import { Array as Arr, pipe } from "effect";

import type { Format } from "#/shared/config/index.ts";

export type Segment = Readonly<{ text: string; code: boolean; emphasis: boolean }>;
export type Line = Readonly<{ segments: readonly Segment[]; caption: boolean }>;

export type SceneBase = Readonly<{
  id: string;
  formats: readonly Format[];
  fixedSeconds?: number;
  lines: readonly Line[];
}>;

export type SceneBody =
  | Readonly<{ kind: "title"; title: readonly Segment[]; items: readonly Line[] }>
  | Readonly<{ kind: "ending"; title: readonly Segment[] }>
  | Readonly<{ kind: "talk"; heading: readonly Segment[] }>
  | Readonly<{ kind: "points"; heading: readonly Segment[]; items: readonly Line[] }>
  | Readonly<{ kind: "code"; heading: readonly Segment[]; code: readonly string[] }>
  | Readonly<{ kind: "media"; heading: readonly Segment[]; src: string; alt: string }>
  | Readonly<{ kind: "quote"; text: string; source?: string }>
  | Readonly<{ kind: "rating"; heading: readonly Segment[]; score: number; max: number }>;

export type Scene = SceneBase & SceneBody;

export type SceneKind = Scene["kind"];

export type Bgm = Readonly<{ url: string; credit: string }>;

export type Script = Readonly<{
  title: string;
  formats: readonly Format[];
  length: Readonly<Record<Format, number>>;
  voice?: number;
  readings: Readonly<Record<string, string>>;
  bgm?: Bgm;
  scenes: readonly Scene[];
}>;

export const plainOf = (segments: readonly Segment[]): string =>
  pipe(
    segments,
    Arr.map(({ text }) => text),
    Arr.join(""),
  );

export const textOf = (line: Line): string => plainOf(line.segments);
