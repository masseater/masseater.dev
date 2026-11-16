import { String as Str } from "effect";
import { useEffect } from "react";

const KEY = "z";
const FIELD = "input, textarea, select, [contenteditable]";

const typing = ({ target }: KeyboardEvent): boolean =>
  target instanceof Element && target.closest(FIELD) !== null;

const undoes = (event: KeyboardEvent): boolean =>
  Str.toLowerCase(event.key) === KEY &&
  (event.ctrlKey || event.metaKey) &&
  !event.shiftKey &&
  !event.altKey &&
  !typing(event);

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
