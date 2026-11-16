import type { Aspect, Verb } from "@masseater.dev/shirushi-protocol";

export const SOUND_ASPECTS: readonly Aspect[] = [
  "rhythm",
  "bass",
  "chords",
  "melody",
  "tone",
  "voice",
  "arrangement",
  "mix",
];

export const PICTURE_ASPECTS: readonly Aspect[] = [
  "composition",
  "color",
  "light",
  "line",
  "texture",
  "motion",
  "cut",
];

export const ASPECT_LABELS: Readonly<Record<Aspect, string>> = {
  rhythm: "リズム",
  bass: "ベース",
  chords: "コード",
  melody: "メロディ",
  tone: "音色",
  voice: "声",
  arrangement: "展開",
  mix: "ミックス",
  composition: "構図",
  color: "色",
  light: "光",
  line: "線",
  texture: "質感",
  motion: "動き",
  cut: "カット",
};

export const VERB_LABELS: Readonly<Record<Verb, string>> = { like: "好き", dislike: "苦手" };
