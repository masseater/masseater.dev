import { Option, Record as Rec } from "effect";

export const optional =
  <Key extends string>(key: Key) =>
  <Value>(value: Option.Option<Value>): Partial<Record<Key, Value>> =>
    Option.match(value, {
      onNone: (): Partial<Record<Key, Value>> => ({}),
      onSome: (present): Partial<Record<Key, Value>> => Rec.singleton(key, present),
    });
