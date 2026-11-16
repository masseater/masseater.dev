import { Predicate, Record as Rec } from "effect";

export const fieldOf =
  <Key extends string>(key: Key) =>
  <Value>(value: Value | undefined): Partial<Readonly<Record<Key, Value>>> => {
    if (Predicate.isUndefined(value)) {
      return {};
    }
    return Rec.singleton(key, value);
  };
