import type { Part } from "@masseater.dev/tachie";
import type { Option } from "effect";

import type { Format, SfxKind } from "#/shared/config/index.ts";
import type { Segment } from "#/shared/lib/segment.ts";

import type { Narration } from "./narration.ts";

export interface TimedLine {
  readonly segments: readonly Segment[];
  readonly from: number;
  readonly duration: number;
  readonly audio: Option.Option<string>;
  readonly emphasisAt: Option.Option<number>;
}

export interface TimedCut {
  readonly id: string;
  readonly voice: number;
  readonly from: number;
  readonly duration: number;
  readonly lines: readonly TimedLine[];
}

export interface Shot extends TimedCut {
  readonly format: Format;
  readonly sfx: Readonly<Record<SfxKind, string>>;
  readonly credits: readonly string[];
  readonly images: Readonly<Record<string, string>>;
  readonly portraits: Readonly<Record<string, string>>;
}

export interface ImageTachie {
  readonly kind: "image";
  readonly closed: string;
  readonly open: Option.Option<string>;
}

export interface PsdTachie {
  readonly kind: "psd";
  readonly psd: string;
  readonly favorites: Option.Option<string>;
  readonly parts: readonly Part[];
}

export type Tachie = ImageTachie | PsdTachie;

export interface Timeline {
  readonly format: Format;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly durationInFrames: number;
  readonly cuts: readonly TimedCut[];
  readonly bgm: Option.Option<string>;
  readonly sfx: Readonly<Record<SfxKind, string>>;
  readonly credits: readonly string[];
  readonly tachie: Option.Option<Tachie>;
  readonly images: Readonly<Record<string, string>>;
  readonly portraits: Readonly<Record<string, string>>;
}

export interface Sources {
  readonly narration: Narration;
  readonly narrationSrc: (key: string) => string;
  readonly assetSrc: (url: string) => string;
  readonly speakers: Readonly<Record<string, string>>;
  readonly tachie: Option.Option<Tachie>;
  readonly portraits: Readonly<Record<string, string>>;
}
