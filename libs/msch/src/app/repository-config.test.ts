import type { Rule } from "@r_masseater/wism";
import { Option, Record as Rec, pipe } from "effect";
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

const placementRule = (): Option.Option<Rule> =>
  pipe(
    Option.fromNullishOr(config.wism),
    Option.flatMap(({ plugins }) => Option.fromNullishOr(plugins)),
    Option.flatMap(Rec.get("structure")),
    Option.flatMap(({ rules }) => Option.fromNullishOr(rules)),
    Option.flatMap(Rec.get("placement")),
  );

const reportedByPlacement = (files: readonly string[]): readonly string[] => {
  const reportedBy = ({ check }: Rule): readonly string[] => {
    const found: string[] = [];
    check({
      root: "/repo",
      files,
      edges: [],
      options: {},
      report: ({ path }) => {
        found.push(path);
      },
    });
    return found;
  };
  return pipe(
    placementRule(),
    Option.map(reportedBy),
    Option.getOrElse((): readonly string[] => []),
  );
};

describe("repositoryConfig task cache", () => {
  it("caches tasks and scripts without a remote cache unless one is named", () => {
    expect(config).toMatchObject({ run: { cache: true } });
  });

  it("reads the remote task cache the repository names", () => {
    const shared = repositoryConfig({
      workspace: WORKSPACE,
      run: { remoteCache: "https://cache.example/projects/demo" },
    });
    expect(shared).toMatchObject({
      run: {
        cache: {
          scripts: true,
          tasks: true,
          remote: { url: "https://cache.example/projects/demo" },
        },
      },
    });
  });
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

  it("checks the overrides in the daily task and keeps them out of verify", () => {
    expect(config).toMatchObject({
      run: { tasks: { daily: { command: "msch --overrides", cache: false } } },
    });
  });

  it("lays out every member workspace with wism", () => {
    const reported = reportedByPlacement([
      "apps/web/package.json",
      "apps/web/stray.ts",
      "tools/x/package.json",
      "tools/x/stray.ts",
    ]);
    expect(config).toHaveProperty(["wism", "rules", "structure/placement"], "error");
    expect(reported).toStrictEqual(["apps/web/stray.ts"]);
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
