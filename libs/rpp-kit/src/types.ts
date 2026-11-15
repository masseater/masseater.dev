export type Note = Readonly<{ pitch: number; velocity: number; start: number; duration: number }>;

export type Source =
  | Readonly<{ kind: "midi"; notes: readonly Note[] }>
  | Readonly<{ kind: "audio"; file: string }>
  | Readonly<{ kind: "video"; file: string }>
  | Readonly<{ kind: "other"; type: string }>;

export type Item = Readonly<{ name: string; position: number; length: number; source: Source }>;

export type FxParam = Readonly<{ slider: number; value: number | string }>;

export type FxState = Readonly<{ guid: string; bypass: boolean; offline: boolean }>;

export type Fx =
  | (FxState & Readonly<{ kind: "js"; file: string; params: readonly FxParam[] }>)
  | (FxState & Readonly<{ kind: "other"; type: string }>);

export type Track = Readonly<{
  index: number;
  guid: string;
  name: string;
  items: readonly Item[];
  fx: readonly Fx[];
}>;

export type Marker = Readonly<{ id: number; name: string; time: number }>;

export type Region = Readonly<{ id: number; name: string; start: number; end: number }>;

export type Section = Readonly<{ name: string; start: number; end: number }>;

export type Tempo = Readonly<{ bpm: number; numerator: number; denominator: number }>;

export type TempoPoint = Readonly<{
  time: number;
  bpm: number;
  numerator: number;
  denominator: number;
  shape: "square" | "linear";
}>;

export type Song = Readonly<{
  tempo: Tempo;
  tempoMap: readonly TempoPoint[];
  sampleRate: number;
  length: number;
  markers: readonly Marker[];
  regions: readonly Region[];
  sections: readonly Section[];
  tracks: readonly Track[];
}>;
