import { Array as Arr, Option, pipe } from "effect";

import { NOTHING, ONE } from "#/shared/config/index.ts";

export interface Keyed<Value> {
  readonly key: string;
  readonly value: Value;
  readonly position: number;
  readonly at: number;
}

export interface KeyRequest<Value> {
  readonly values: readonly Value[];
  readonly label: (value: Value) => string;
  readonly reveals: readonly number[];
}

export const keyed = <Value>({
  values,
  label,
  reveals,
}: KeyRequest<Value>): readonly Keyed<Value>[] =>
  pipe(
    values,
    Arr.map((value, position) => ({
      key: `${String(position + ONE)}:${label(value)}`,
      value,
      position,
      at: Option.getOrElse(Arr.get(reveals, position), () => NOTHING),
    })),
  );
