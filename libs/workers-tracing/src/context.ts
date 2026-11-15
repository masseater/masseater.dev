import { AsyncLocalStorage } from "node:async_hooks";

export type RunInContext = <Result>(evaluate: () => Result) => Result;

export const capture = (): RunInContext => {
  const snapshot = AsyncLocalStorage.snapshot();
  return (evaluate) => snapshot(evaluate);
};
