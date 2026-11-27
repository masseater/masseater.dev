import { Cause, Option } from "effect";
import { AsyncResult } from "effect/reactivity";

export type Loaded<Value> =
  | Readonly<{ status: "loading" }>
  | Readonly<{ status: "failed"; message: string }>
  | Readonly<{ status: "ready"; value: Value }>;

const LOADING = { status: "loading" } as const;

/** @internal */
export const loadedOf = <Value, Failure>(
  result: Readonly<AsyncResult.AsyncResult<Value, Failure>>,
): Loaded<Value> =>
  AsyncResult.match(result, {
    onInitial: (): Loaded<Value> => LOADING,
    onFailure: ({ cause }): Loaded<Value> => ({ status: "failed", message: Cause.pretty(cause) }),
    onSuccess: ({ value }): Loaded<Value> => ({ status: "ready", value }),
  });

export const readyValue = <Value>(loaded: Loaded<Value>): Option.Option<Value> => {
  if (loaded.status === "ready") {
    return Option.some(loaded.value);
  }
  return Option.none();
};

export const mapLoaded =
  <Value, Next>(change: (value: Value) => Next) =>
  (loaded: Loaded<Value>): Loaded<Next> => {
    if (loaded.status === "ready") {
      return { status: "ready", value: change(loaded.value) };
    }
    return loaded;
  };
