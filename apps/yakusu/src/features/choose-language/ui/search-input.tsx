import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";

import {
  useClosePicker,
  useQueryText,
  useSetQueryText,
} from "#/features/choose-language/model/search";

const LABEL = "言語を検索";

const SearchInput = (): ReactNode => {
  const query = useQueryText();
  const setQuery = useSetQueryText();
  const close = useClosePicker();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setQuery(event.currentTarget.value);
    },
    [setQuery],
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
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
      onKeyDown={onKeyDown}
    />
  );
};

export { SearchInput };
