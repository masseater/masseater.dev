import { Function as Fn } from "effect";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const SLACK = 48;
const WATCHED = { childList: true, subtree: true, characterData: true } as const;

const nearBottom = (element: HTMLElement): boolean =>
  element.scrollHeight - element.scrollTop - element.clientHeight < SLACK;

export const useStickToBottom = (): RefObject<HTMLDivElement | null> => {
  const ref = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  useEffect(() => {
    const element = ref.current;
    if (element === null) {
      return Fn.constVoid;
    }
    const onScroll = (): void => {
      pinnedRef.current = nearBottom(element);
    };
    const observer = new MutationObserver(() => {
      if (pinnedRef.current) {
        element.scrollTop = element.scrollHeight;
      }
    });
    element.scrollTop = element.scrollHeight;
    element.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(element, WATCHED);
    return (): void => {
      observer.disconnect();
      element.removeEventListener("scroll", onScroll);
    };
  }, []);
  return ref;
};
