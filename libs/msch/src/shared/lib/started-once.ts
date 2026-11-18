import { Option } from "effect";

export const startedOnce = <Value>(): ((
  key: string,
  start: () => Promise<Value>,
) => Promise<Value>) => {
  const started = new Map<string, Promise<Value>>();
  return (key, start) =>
    Option.getOrElse(Option.fromNullishOr(started.get(key)), () => {
      const promise = start();
      started.set(key, promise);
      return promise;
    });
};
