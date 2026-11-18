import { it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { describe, expect } from "vite-plus/test";

import { programOf } from "./workspace-config-source.ts";
import { tasksOf } from "./workspace-tasks.ts";

const CONFIG = `export default { run: { tasks: { test: { command: "t" }, native: { command: "n" } } } };`;

describe("workspace tasks", () => {
  it.effect("makes tests wait for a native addon build", () =>
    Effect.gen(function* makesTestsWait() {
      const program = yield* programOf("vite.config.ts", CONFIG);
      expect(tasksOf(Option.some({ name: "addon" }))(program)).toStrictEqual({
        verify: ["addon#test"],
        native: ["addon#native"],
      });
    }),
  );

  it.effect("leaves an archived native distribution out of the test prerequisites", () =>
    Effect.gen(function* leavesArchiveOut() {
      const program = yield* programOf("vite.config.ts", CONFIG);
      const manifest = { name: "dist", native: { archive: true } };
      expect(tasksOf(Option.some(manifest))(program)).toStrictEqual({
        verify: ["dist#test"],
        native: [],
      });
    }),
  );
});
