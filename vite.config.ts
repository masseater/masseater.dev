import { repositoryConfig } from "@r_masseater/msch/config";
import {
  INSTRUMENTATION,
  decisionRules,
  removalPolicySyntax,
  requiredStack,
  tracedRules,
} from "@r_masseater/msch/lint";
import { workspaceSettings } from "@r_masseater/msch/workspace-settings";
import { restrictedSyntax as unguardedWorkersAi } from "@r_masseater/workers-tracing/oxlint";
import { defineConfig } from "vite-plus";

const workspace = await workspaceSettings({
  root: import.meta.dirname,
  ruleSets: { decision: decisionRules, traced: tracedRules },
  dependencySets: { instrumentation: requiredStack[INSTRUMENTATION] ?? [] },
});

export default defineConfig({
  ...repositoryConfig({
    workspace,
    overrides: [
      { files: [...workspace.lint.deployEntries], rules: tracedRules },
      {
        files: ["apps/*/src/**/*.{ts,tsx}"],
        excludeFiles: ["**/*.test.ts"],
        rules: {
          "eslint-js/no-restricted-syntax": ["error", removalPolicySyntax, ...unguardedWorkersAi],
        },
      },
    ],
    secrets: {
      lines: [String.raw`\bOWNER_DISCORD_ID = "[0-9]{17,20}"`],
      paths: [String.raw`(^|/)fixtures/[^/]+\.tgz!`],
    },
    textlint: {
      ignores: ["apps/zenn-articles/**", "**/.cache/**"],
      kanji: [
        "個人情報保護法",
        "中小企業基盤整備機構",
        "小規模企業共済",
        "中小企業倒産防止共済",
        "情報処理推進機構",
        "情報通信研究機構",
        "国立情報学研究所",
        "日本情報経済社会推進協会",
        "国立研究開発法人",
        "大学共同利用機関",
      ],
      technicalWriting: {
        "no-exclamation-question-mark": { allow: ["ぶいあーる!", "超かぐや姫!", "超かぐや姫！"] },
      },
      rules: { "@r_masseater/preset-ja": { "no-taigendome": false } },
    },
    run: { tasks: { "db-check-all": "vp run -r db:check" } },
  }),
  msch: {
    workspaceAgentsMd: true,
    comments: { allow: ["(?:note|pass|text|glyphs|dispatch):"] },
  },
});
