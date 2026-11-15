import type { Option } from "effect";

import type { Param } from "./parse.ts";
import type { Marker, Song, Track } from "./types.ts";

export type Spanned = Readonly<{ value: number; param: Option.Option<Param> }>;

export type MarkerOutline = Readonly<{
  marker: Marker;
  name: Option.Option<Param>;
  time: Option.Option<Param>;
}>;

export type TrackOutline = Readonly<{ track: Track; name: Option.Option<Param> }>;

export type TempoOutline = Readonly<{ bpm: Spanned; numerator: Spanned; denominator: Spanned }>;

export type SongOutline = Readonly<{
  song: Song;
  tempo: TempoOutline;
  markers: readonly MarkerOutline[];
  tracks: readonly TrackOutline[];
  files: readonly Param[];
}>;
