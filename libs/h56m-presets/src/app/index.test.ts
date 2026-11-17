import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { makeDetector } from "@r_masseater/h56m";
import type { Finding, H56mError } from "@r_masseater/h56m";
import { Array as Arr, Effect, FileSystem } from "effect";
import { expect } from "vite-plus/test";

import { betterleaks } from "./index.ts";

const GITHUB = Arr.join(["ghp", "4Fq8sLm2Zt9Wn6Rb1Yc3Xv7Hk5Pd0Ja8Qe2T"], "_");
const AWS = Arr.join(["AKIA", "Z7XQ2JN4VBD3KPLM"], "");
const TIMEOUT = 120_000;

const rulesOf = Arr.map(({ rule }: Finding) => rule);

const scan = (
  text: string,
  disabledRules: readonly string[] = [],
): Effect.Effect<readonly Finding[], H56mError> =>
  makeDetector({ extend: { path: betterleaks, disabledRules } }).pipe(
    Effect.flatMap((detector) => detector.scanText({ path: "src/a.ts", text })),
  );

const shipsTheBetterleaksDefaults = Effect.gen(function* shipsTheBetterleaksDefaults() {
  const fileSystem = yield* FileSystem.FileSystem;
  const text = yield* fileSystem.readFileString(betterleaks);
  expect(text).toContain("This is the default betterleaks configuration file.");
});

const findsKnownSecrets = Effect.gen(function* findsKnownSecrets() {
  const found = yield* scan(`const g = "${GITHUB}";\nconst a = "${AWS}";\n`);
  expect(rulesOf(found)).toStrictEqual(["github-pat", "aws-access-token"]);
});

const findsNothingInPlainCode = Effect.gen(function* findsNothingInPlainCode() {
  const found = yield* scan("export const answer = 42;\n");
  expect(found).toStrictEqual([]);
});

const turnsRulesOff = Effect.gen(function* turnsRulesOff() {
  const found = yield* scan(`const g = "${GITHUB}";\nconst a = "${AWS}";\n`, ["github-pat"]);
  expect(rulesOf(found)).toStrictEqual(["aws-access-token"]);
});

layer(nodeServicesLayer)("betterleaks preset", (it) => {
  it.effect("ships the Betterleaks defaults", () => shipsTheBetterleaksDefaults);
  it.effect("finds known secrets through h56m", () => findsKnownSecrets, TIMEOUT);
  it.effect("finds nothing in plain code", () => findsNothingInPlainCode, TIMEOUT);
  it.effect("turns rules off with disabledRules", () => turnsRulesOff, TIMEOUT);
});
