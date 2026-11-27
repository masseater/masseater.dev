import { Option } from "effect";

export const once = <Value>(make: () => Value): (() => Value) => {
  let made: Option.Option<Value> = Option.none();
  return () =>
    Option.getOrElse(made, () => {
      const value = make();
      made = Option.some(value);
      return value;
    });
};
