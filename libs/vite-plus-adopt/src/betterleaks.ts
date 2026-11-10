import { Array as Arr, pipe } from "effect";
import { stringify } from "smol-toml";

import type { BetterleaksConfig } from "./types.ts";

const toBetterleaksToml = (config: BetterleaksConfig): string => {
  const { ignoredSecrets: _ignoredSecrets, ...rest } = config;
  return stringify(rest);
};

const toIgnoreFile = (config: BetterleaksConfig): string =>
  pipe(
    config.ignoredSecrets ?? [],
    Arr.map((digest) => `${digest}\n`),
    Arr.join(""),
  );

export { toBetterleaksToml, toIgnoreFile };
