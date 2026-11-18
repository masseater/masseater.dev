import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { ignoredDirectories } from "@r_masseater/msch/workspace-settings";
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

const inputs = [...LOCKED.input, ...(await ignoredDirectories(`${import.meta.dirname}/../..`))];

export default defineConfig({
  msch: {
    publish: { installSize: "330 MB" },
    lint: {
      overrides: [
        {
          files: ["src/app/oxlint.ts"],
          rules: {
            "node/no-sync": "off",
            "effecttsgo/node-builtin-import": "off",
            "effecttsgo/schema-sync": "off",
          },
        },
        {
          files: ["src/features/ban-comments/model/comments.ts"],
          rules: { "effecttsgo/node-builtin-import": "off" },
        },
      ],
    },
  },
  plugins: [otlp()],
  resolve: {
    dedupe: ["vitest"],
  },
  pack: {
    entry: {
      cli: "bin/msch.ts",
      changed: "bin/msch-changed.ts",
      exits: "bin/msch-exits.ts",
      publish: "bin/msch-publish.ts",
      "cargo-inputs": "src/features/derive-cargo-inputs/index.ts",
      "locked-inputs": "src/features/derive-locked-inputs/index.ts",
      config: "src/app/repository-config.ts",
      oxlint: "src/app/oxlint.ts",
      lint: "src/features/define-lint-preset/index.ts",
      "decision-rules": "src/app/decision-rules.ts",
      "lint-rules": "src/features/define-lint-rules/index.ts",
      "workspace-settings": "src/features/build-workspace-settings/index.ts",
    },
    platform: "node",
    deps: { alwaysBundle: [/^@masseater\.dev\//u] },
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  test: {
    isolate: false,
    testTimeout: 30_000,
    server: {
      deps: {
        inline: ["@effect/vitest"],
      },
    },
  },
  run: {
    tasks: {
      test: { command: "vp test run", cache: { input: inputs } },
      verify: { command: [], dependsOn: ["build"] },
      build: {
        command: "vp pack",
        dependsOn: [{ task: "build", from: "dependencies" }],
        cache: { input: inputs },
      },
    },
  },
});
