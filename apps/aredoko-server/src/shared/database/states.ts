const RENDER = { none: 0, pending: 1, done: 2, failed: -1 } as const;

const EMBEDDING = { pending: 0, done: 1, failed: -1 } as const;

export { EMBEDDING, RENDER };
