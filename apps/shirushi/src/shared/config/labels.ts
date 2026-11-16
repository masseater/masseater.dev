import { Aspect } from "@masseater.dev/shirushi-protocol";
import type { Verb } from "@masseater.dev/shirushi-protocol";

export const ASPECTS = Aspect.literals;

export const ASPECT_LABELS: Readonly<Record<Aspect, string>> = {
  rhythm: "リズム",
  bass: "ベース",
  chords: "コード",
  melody: "メロディ",
  tone: "音色",
  voice: "声",
  arrangement: "展開",
  mix: "ミックス",
};

export const VERB_LABELS: Readonly<Record<Verb, string>> = { like: "好き", dislike: "苦手" };
