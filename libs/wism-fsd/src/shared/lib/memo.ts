import { Option } from "effect";

export const memoize = <Value>(compute: (key: string) => Value): ((key: string) => Value) => {
  const cache = new Map<string, Value>();
  const store = (key: string): Value => {
    const value = compute(key);
    cache.set(key, value);
    return value;
  };
  return (key) => Option.getOrElse(Option.fromNullishOr(cache.get(key)), () => store(key));
};
