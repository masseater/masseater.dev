import { Array as Arr, pipe } from "effect";

const FIELD = "input, textarea, select, button, [contenteditable]";

const MODIFIERS = ["ctrlKey", "metaKey", "altKey", "isComposing"] as const;

const inField = ({ target }: KeyboardEvent): boolean =>
  target instanceof Element && target.closest(FIELD) !== null;

export const ignoredKey = (event: KeyboardEvent): boolean =>
  pipe(
    MODIFIERS,
    Arr.some((key) => event[key]),
  ) || inField(event);
