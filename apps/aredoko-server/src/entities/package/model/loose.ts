import { Array, String, pipe } from "effect";

import { hasExtension, partsOf } from "./file-name.ts";
import { kindOf } from "./kind.ts";

const LOOSE_KINDS = ["texture", "model", "audio"] as const;
const COMPANION_EXTENSIONS = [".mtl", ".bin"] as const;
const HIDDEN = ".";

const isHidden = (name: string): boolean =>
  pipe(
    partsOf(name),
    Array.some((part) => pipe(part, String.startsWith(HIDDEN))),
  );

export const isLoose = (name: string): boolean =>
  pipe(
    LOOSE_KINDS,
    Array.some((kind) => kind === kindOf(name)),
  ) && !isHidden(name);

const hasCompanionExtension = hasExtension(...COMPANION_EXTENSIONS);

export const isCompanion = (name: string): boolean =>
  hasCompanionExtension(name) && !isHidden(name);
