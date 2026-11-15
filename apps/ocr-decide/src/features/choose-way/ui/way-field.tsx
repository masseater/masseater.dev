import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useSetWay, useWay, WAYS } from "#/entities/extraction/index.ts";
import { COPY } from "#/shared/config/index.ts";
import { SELECT_CLASS } from "#/shared/ui/select-class.ts";

export const WayField = (): ReactNode => {
  const way = useWay();
  const setWay = useSetWay();
  const pick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setWay(event.target.value);
    },
    [setWay],
  );
  return (
    <select aria-label={COPY.way} value={way} onChange={pick} className={SELECT_CLASS}>
      {pipe(
        WAYS,
        Arr.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        )),
      )}
    </select>
  );
};
