import { useCallback } from "react";
import type { ChangeEventHandler, ReactNode } from "react";

import { TEXT } from "#/pages/ranking/model/labels";

const SongSearch = ({
  query,
  onChange,
}: Readonly<{ query: string; onChange: (query: string) => void }>): ReactNode => {
  const change = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      onChange(event.target.value);
    },
    [onChange],
  );
  return (
    <input
      type="search"
      defaultValue={query}
      placeholder={TEXT.search}
      aria-label={TEXT.search}
      onChange={change}
      className="bg-background min-w-48 flex-1 rounded-md border px-3 py-1 text-sm"
    />
  );
};

export { SongSearch };
