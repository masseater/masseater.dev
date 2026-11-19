import { useCallback, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";

import {
  useClosePicker,
  useQueryText,
  useSetQueryText,
} from "#/features/pick-language/model/search.ts";

const LABEL = "言語を検索";

const COMPOSITION_WINDOW_MS = 50;

export const SearchInput = (): ReactNode => {
  const query = useQueryText();
  const setQuery = useSetQueryText();
  const close = useClosePicker();
  const compositionEndRef = useRef(Number.NEGATIVE_INFINITY);
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.currentTarget.value);
    },
    [setQuery],
  );
  const onCompositionEnd = useCallback(({ timeStamp }: Readonly<{ timeStamp: number }>) => {
    compositionEndRef.current = timeStamp;
  }, []);
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (
        event.key === "Escape" &&
        !event.nativeEvent.isComposing &&
        Math.abs(event.timeStamp - compositionEndRef.current) >= COMPOSITION_WINDOW_MS
      ) {
        close();
      }
    },
    [close],
  );
  return (
    <input
      aria-label={LABEL}
      className="h-12 flex-1 bg-transparent text-base outline-none"
      placeholder={LABEL}
      value={query}
      onChange={onChange}
      onCompositionEnd={onCompositionEnd}
      onKeyDown={onKeyDown}
    />
  );
};
