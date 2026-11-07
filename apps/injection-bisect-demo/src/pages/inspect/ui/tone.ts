import type { Tone } from "#/pages/inspect/model/overlay";

const TONE_CLASS: Readonly<Record<Tone, string>> = {
  none: "",
  pending: "rounded-sm bg-amber-400/30 animate-pulse",
  miss: "rounded-sm bg-sky-500/15",
  hit: "rounded-sm bg-destructive/20",
  injection: "rounded-sm bg-destructive/45",
};

const ANSWER_CLASS =
  "underline decoration-dashed decoration-foreground/70 decoration-2 underline-offset-4";

const BAR_CLASS: Readonly<Record<Tone, string>> = {
  none: "fill-muted",
  pending: "fill-amber-400 animate-pulse",
  miss: "fill-sky-500",
  hit: "fill-destructive",
  injection: "fill-destructive",
};

export { ANSWER_CLASS, BAR_CLASS, TONE_CLASS };
