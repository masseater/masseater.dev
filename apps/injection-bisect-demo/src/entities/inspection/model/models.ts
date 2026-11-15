import { DEFAULT_MODEL } from "@r_masseater/injection-bisect";

export const MAX_CHARS = 8000;

export const MODELS = [
  DEFAULT_MODEL,
  "respan/span-01",
  "typesafe/jev-1.13",
  "inception/mercury-decide",
] as const;
