import { layer } from "@effect/vitest";
import { assertFalse, assertTrue, strictEqual } from "@effect/vitest/utils";
import { Effect, Layer, String as Str } from "effect";

import { toBetterleaksToml, toIgnoreFile } from "./betterleaks.ts";

const DIGEST = "0000000000000000000000000000000000000000000000000000000000000000";

const CONFIG = {
  extend: { useDefault: true, disabledRules: ["generic-api-key"] },
  filter: "matchesAny(finding.line, [`CF_BEACON_TOKEN`])",
  rules: [{ id: "fixture", regex: "fixture-[0-9]+", keywords: ["fixture-"] }],
  ignoredSecrets: [DIGEST],
} as const;

const writesTheConfigAsToml = Effect.sync(() => {
  const toml = toBetterleaksToml(CONFIG);
  assertTrue(Str.includes("useDefault = true")(toml));
  assertTrue(Str.includes('disabledRules = [ "generic-api-key" ]')(toml));
  assertTrue(Str.includes("filter = ")(toml));
  assertTrue(Str.includes("[[rules]]")(toml));
});

const keepsIgnoredSecretsOutOfTheConfig = Effect.sync(() => {
  assertFalse(Str.includes("ignoredSecrets")(toBetterleaksToml(CONFIG)));
  assertFalse(Str.includes(DIGEST)(toBetterleaksToml(CONFIG)));
});

const writesOneDigestPerLine = Effect.sync(() => {
  strictEqual(toIgnoreFile(CONFIG), `${DIGEST}\n`);
  strictEqual(toIgnoreFile({}), "");
});

layer(Layer.empty)("betterleaks config", (it) => {
  it.effect("writes the section as Betterleaks TOML", () => writesTheConfigAsToml);
  it.effect("keeps the ignored secrets out of the TOML", () => keepsIgnoredSecretsOutOfTheConfig);
  it.effect("writes the ignored secrets one digest per line", () => writesOneDigestPerLine);
});
