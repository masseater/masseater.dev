import { Option } from "effect";

export const memoizeByKey = <Key extends WeakKey, Value>(
  compute: (key: Key) => Value,
): ((key: Key) => Value) => {
  const cache = new WeakMap<Key, Value>();
  return (key) => cache.getOrInsertComputed(key, () => compute(key));
};

export const lazily = <Value>(compute: () => Value): (() => Value) => {
  const cell: { value?: Option.Option<Value> } = {};
  return () => {
    const cached = Option.flatten(Option.fromNullishOr(cell.value));
    if (Option.isSome(cached)) {
      return cached.value;
    }
    const computed = compute();
    cell.value = Option.some(computed);
    return computed;
  };
};
