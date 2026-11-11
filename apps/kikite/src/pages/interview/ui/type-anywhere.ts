import { useEffect } from "react";

const ANSWER_ID = "answer";
const INTERACTIVE = "button, a, input, textarea";
const FIELD = "input, textarea";
const CHARACTER = 1;
const IME = "Process";

const focusAnswer = (): void => {
  const input = document.querySelector<HTMLInputElement>(`#${ANSWER_ID}`);
  if (input !== null) {
    input.focus();
  }
};

const isWithin = (event: KeyboardEvent | MouseEvent, selector: string): boolean =>
  event.target instanceof Element && event.target.closest(selector) !== null;

const modified = (event: KeyboardEvent): boolean => event.ctrlKey || event.metaKey || event.altKey;

const producesText = (event: KeyboardEvent): boolean =>
  event.key.length === CHARACTER || event.key === IME || event.isComposing;

const isTyping = (event: KeyboardEvent): boolean => !modified(event) && producesText(event);

const onKey = (event: KeyboardEvent): void => {
  if (isTyping(event) && !isWithin(event, FIELD)) {
    focusAnswer();
  }
};

const onTap = (event: MouseEvent): void => {
  if (!isWithin(event, INTERACTIVE)) {
    focusAnswer();
  }
};

const useTypeAnywhere = (): void => {
  useEffect(() => {
    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener("click", onTap);
    return (): void => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener("click", onTap);
    };
  }, []);
};

export { ANSWER_ID, useTypeAnywhere };
