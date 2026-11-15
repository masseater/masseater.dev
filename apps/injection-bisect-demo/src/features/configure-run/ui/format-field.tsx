import { formatsOf } from "@r_masseater/injection-bisect";
import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useFormat, useSetFormat } from "#/entities/inspection";
import { COPY } from "#/shared/config";
import { SELECT_CLASS } from "#/shared/ui/select-class";

const TEXT_FORMATS = formatsOf({ readers: [] });

const [AUTO_FORMAT] = TEXT_FORMATS;

const labelOf = (format: string): string => {
  if (format === AUTO_FORMAT) {
    return COPY.auto;
  }
  return format;
};

const FormatField = (): ReactNode => {
  const format = useFormat();
  const setFormat = useSetFormat();
  const pick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setFormat(event.target.value);
    },
    [setFormat],
  );
  return (
    <select aria-label={COPY.format} value={format} onChange={pick} className={SELECT_CLASS}>
      {pipe(
        TEXT_FORMATS,
        Arr.map((id) => (
          <option key={id} value={id}>
            {labelOf(id)}
          </option>
        )),
      )}
    </select>
  );
};

export { FormatField };
