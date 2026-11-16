import { Array as Arr, pipe } from "effect";
import { stringify } from "smol-toml";

import type { BetterleaksConfig } from "#/shared/config/index.ts";

export const toBetterleaksToml = (config: BetterleaksConfig): string => {
  const { ignoredSecrets: _ignoredSecrets, ...rest } = config;
  return stringify(rest);
};

export const toIgnoreFile = (config: BetterleaksConfig): string =>
  pipe(
    config.ignoredSecrets ?? [],
    Arr.map((digest) => `${digest}\n`),
    Arr.join(""),
  );
