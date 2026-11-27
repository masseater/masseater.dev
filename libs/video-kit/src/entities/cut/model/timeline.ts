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
  readonly from: number;
  readonly duration: number;
  readonly lines: readonly TimedLine[];
}

export interface Shot extends TimedCut {
  readonly format: Format;
  readonly sfx: Readonly<Record<SfxKind, string>>;
  readonly credits: readonly string[];
}

export interface Tachie {
  readonly closed: string;
  readonly open: Option.Option<string>;
}

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
}

export interface Sources {
  readonly narration: Narration;
  readonly narrationSrc: (key: string) => string;
  readonly assetSrc: (url: string) => string;
  readonly speakerName: Option.Option<string>;
  readonly tachie: Option.Option<Tachie>;
}
