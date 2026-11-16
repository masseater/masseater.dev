import { formatsOf } from "@r_masseater/injection-bisect";
import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { useFormat, useSetFormat } from "#/entities/inspection/index.ts";
import { COPY } from "#/shared/config/index.ts";
import { SELECT_CLASS } from "#/shared/ui/select-class.ts";

const TEXT_FORMATS = formatsOf({ readers: [] });

const [AUTO_FORMAT] = TEXT_FORMATS;

const labelOf = (format: string): string => {
  if (format === AUTO_FORMAT) {
    return COPY.auto;
  }
  return format;
};

export const FormatField = (): ReactNode => {
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
