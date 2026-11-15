export const VECTOR_DIMENSIONS = 768;

export const vectorBytes = (vector: readonly number[]): Uint8Array =>
  new Uint8Array(Float32Array.from(vector).buffer);
