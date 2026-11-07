type EngineMessage = Readonly<Record<string, unknown>>;

type Engine = Readonly<{
  msg: (message: EngineMessage) => void;
  run: (left: Float64Array, right: Float64Array, length: number) => void;
}>;

type EngineOptions = Readonly<{
  audio: boolean;
  params: Readonly<Record<string, number>>;
  auto: Readonly<Record<string, unknown>>;
}>;

declare const createEngine: (sampleRate: number, options: EngineOptions) => Engine;

export { createEngine };
export type { Engine, EngineMessage, EngineOptions };
