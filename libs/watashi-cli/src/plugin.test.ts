import { expect, test } from "vite-plus/test";

import pkg from "#package.json" with { type: "json" };
import plugin from "#plugin.json" with { type: "json" };

test("the Claude Code plugin has the version of the npm package", () => {
  expect(plugin.version).toBe(pkg.version);
});
