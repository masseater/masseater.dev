import { perMedia } from "@masseater.dev/media-notes-ui";
import type { Verb } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";

export type Held = Readonly<{ verb: Verb; from: number }>;

/** @internal */
export const heldAtom = perMedia(Option.none<Held>());
