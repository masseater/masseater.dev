import { Array as Arr, String as Str, pipe } from "effect";
import { useEffect } from "react";

const KEY = "z";
const FIELD = "input, textarea, select, [contenteditable]";

const outsideFields = ({ target }: KeyboardEvent): boolean =>
  !(target instanceof Element && target.closest(FIELD) !== null);

const pressesZ = ({ key }: KeyboardEvent): boolean => Str.toLowerCase(key) === KEY;

const withCommand = ({ ctrlKey, metaKey }: KeyboardEvent): boolean => ctrlKey || metaKey;

const withoutOthers = ({ shiftKey, altKey }: KeyboardEvent): boolean => !shiftKey && !altKey;

const CHECKS = [pressesZ, withCommand, withoutOthers, outsideFields] as const;

const undoes = (event: KeyboardEvent): boolean =>
  pipe(
    CHECKS,
    Arr.every((check) => check(event)),
  );

export const useUndoKey = (undo: () => void): void => {
  useEffect(() => {
    const press = (event: KeyboardEvent): void => {
      if (undoes(event)) {
        event.preventDefault();
        undo();
      }
    };
    globalThis.addEventListener("keydown", press);
    return (): void => {
      globalThis.removeEventListener("keydown", press);
    };
  }, [undo]);
};
