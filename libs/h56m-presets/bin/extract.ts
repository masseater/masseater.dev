import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Effect } from "effect";

import { extractPresets } from "#/features/extract-presets/index.ts";

const output = new URL("..", import.meta.url).pathname;
const manifest = new URL("../package.json", import.meta.url);
const { devDependencies } = JSON.parse(readFileSync(manifest, "utf8"));
const revision = String(devDependencies.betterleaks).split("#").at(-1) ?? "";
const source = dirname(createRequire(manifest).resolve("betterleaks/LICENSE"));

runMain(extractPresets({ source, revision, output }).pipe(Effect.provide(NodeServices.layer)));
