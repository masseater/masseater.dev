import { expect, test } from "vite-plus/test";

import plugin from "#plugin.json" with { type: "json" };

import { VERSION } from "./version.ts";

test("the Claude Code plugin has the version of the npm package", () => {
  expect(plugin.version).toBe(VERSION);
});
