export type EngineMessage = Readonly<Record<string, unknown>>;

export type Engine = Readonly<{
  msg: (message: EngineMessage) => void;
  run: (left: Float64Array, right: Float64Array, length: number) => void;
}>;

export type EngineOptions = Readonly<{
  audio: boolean;
  params: Readonly<Record<string, number>>;
  auto: Readonly<Record<string, unknown>>;
}>;

export declare const createEngine: (sampleRate: number, options: EngineOptions) => Engine;
