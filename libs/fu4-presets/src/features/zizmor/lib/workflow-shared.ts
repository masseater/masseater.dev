import type { EnvValue, LoE } from "#/features/zizmor/model/common.ts";

import { scalarOrVector, string } from "./decode.ts";

export const CACHE_MODES = ["read", "write", "write-only", "none"] as const;

export const emptyEnv = (): LoE<ReadonlyMap<string, EnvValue>> => ({
  type: "literal",
  value: new Map(),
});

export const strings = scalarOrVector(string);

export const noStrings = (): readonly string[] => [];
