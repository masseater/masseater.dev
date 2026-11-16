export type SemconvLevel = "violation" | "improvement" | "information";

export interface SemconvOptions {
  readonly registry?: string;
  readonly weaver?: string;
  readonly failOn?: SemconvLevel;
}

export interface ResolvedSemconv {
  readonly registry: string;
  readonly weaver: string;
  readonly failOn: SemconvLevel;
}

export const SEMCONV_KEY = "vitest-otlp:semconv";
export const FORWARD_KEY = "vitest-otlp:forward";

declare module "vite-plus/test" {
  interface ProvidedContext {
    readonly [SEMCONV_KEY]?: ResolvedSemconv;
    readonly [FORWARD_KEY]?: readonly string[];
  }
}
