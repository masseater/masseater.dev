import { Function as Fn, Option } from "effect";

const DATA_FIRST_ARITY = 2;

export const present: {
  <Value, Fields extends object>(
    build: (value: Value) => Fields,
  ): (value: Option.Option<Value>) => Partial<Fields>;
  <Value, Fields extends object>(
    value: Option.Option<Value>,
    build: (value: Value) => Fields,
  ): Partial<Fields>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  <Value, Fields extends object>(
    value: Option.Option<Value>,
    build: (value: Value) => Fields,
  ): Partial<Fields> => Option.match(value, { onNone: (): Partial<Fields> => ({}), onSome: build }),
);
