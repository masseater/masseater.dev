import type { Tone } from "@masseater.dev/media-notes-ui";
import type { Verb } from "@masseater.dev/shirushi-protocol";

export const VERB_TONES: Readonly<Record<Verb, Tone>> = { like: "plain", dislike: "warn" };

export const GUESS_TONES: Readonly<Record<Verb, Tone>> = { like: "guess", dislike: "guess-warn" };
