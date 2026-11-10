import { Option } from "effect";

const memoizeByKey = <Key extends WeakKey, Value>(
  compute: (key: Key) => Value,
): ((key: Key) => Value) => {
  const cache = new WeakMap<Key, Value>();
  return (key) =>
    Option.fromNullishOr(cache.get(key)).pipe(
      Option.getOrElse(() => {
        const computed = compute(key);
        cache.set(key, computed);
        return computed;
      }),
    );
};

const lazily = <Value>(compute: () => Value): (() => Value) => {
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

export { lazily, memoizeByKey };
