export const startedOnce = <Value>(): ((
  key: string,
  start: () => Promise<Value>,
) => Promise<Value>) => {
  const started = new Map<string, Promise<Value>>();
  return (key, start) => started.getOrInsertComputed(key, () => start());
};
