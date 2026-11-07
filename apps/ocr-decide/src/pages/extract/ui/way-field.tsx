import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "#/pages/extract/model/copy";
import { useSetWay, useWay } from "#/pages/extract/model/draft";
import { WAYS } from "#/pages/extract/model/ways";

import { SELECT_CLASS } from "./select-class";

const WayField = (): ReactNode => {
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

export { WayField };
