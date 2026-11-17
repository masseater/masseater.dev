import { describe, expect, it } from "vite-plus/test";

import type { WorkspaceSettings } from "#/features/build-workspace-settings/index.ts";

import { repositoryConfig } from "./repository-config.ts";

const WORKSPACE: WorkspaceSettings = {
  lint: {
    ignorePatterns: ["apps/web/upstream/**"],
    overrides: [],
    shadcnUi: [],
    publicEntries: ["libs/kit/src/index.ts"],
    deployEntries: ["apps/web/src/app/worker.ts"],
  },
  members: ["apps/web", "libs/kit"],
  ignoredDirectories: [{ pattern: "!**/dist", base: "workspace" }],
  testProjects: ["apps/web"],
  tasks: { verify: ["web#verify"], native: [] },
  devDependencies: {},
};

const OWNER = String.raw`\bOWNER = "[0-9]+"`;
const BEACON = String.raw`\bCF_BEACON_TOKEN = "[0-9a-f]{32}"`;

const config = repositoryConfig({
  workspace: WORKSPACE,
  secrets: { lines: [OWNER] },
  textlint: { ignores: ["docs/**"], kanji: ["個人情報保護法"] },
  run: { tasks: { "db-check-all": "vp run -r db:check" } },
});

describe("repositoryConfig", () => {
  it("makes verify depend on workspace verifies and every root task", () => {
    expect(config).toMatchObject({
      run: {
        tasks: {
          verify: {
            command: [],
            dependsOn: ["web#verify", "fallow", "check", "test", "msch", "audit", "db-check-all"],
          },
        },
      },
    });
  });

  it("lays out every member workspace with wism", () => {
    expect(config).toHaveProperty(["wism", "kinds", "0", "paths"], ["apps/web", "libs/kit"]);
  });

  it("adds repository words to the shared text rules", () => {
    expect(config).toMatchObject({
      textlint: {
        ignores: ["AGENTS.md", "CLAUDE.md", ".agents/skills/**", "CHANGELOG.md", "docs/**"],
        rules: {
          "preset-ja-technical-writing": {
            "max-kanji-continuous-len": { max: 6, allow: ["個人情報保護法"] },
          },
        },
      },
    });
  });

  it("allows public values on top of the shared ones", () => {
    expect(config).toMatchObject({
      h56m: { filter: `matchesAny(finding.line, [\`${BEACON}\`, \`${OWNER}\`])` },
    });
  });
});
