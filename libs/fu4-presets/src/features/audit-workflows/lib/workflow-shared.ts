import type { EnvValue, LoE } from "#/features/audit-workflows/model/common.ts";

import { scalarOrVector, string } from "./decode.ts";

export const emptyEnv = (): LoE<ReadonlyMap<string, EnvValue>> => ({
  type: "literal",
  value: new Map(),
});

export const strings = scalarOrVector(string);

export const noStrings = (): readonly string[] => [];
