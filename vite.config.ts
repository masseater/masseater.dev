import { repositoryConfig } from "@r_masseater/msch/config";
import {
  INSTRUMENTATION,
  cloudflareResourceSyntax,
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
        excludeFiles: ["**/*.test.ts", "**/*.test.tsx", "**/*.test.support.ts"],
        rules: {
          "eslint-js/no-restricted-syntax": [
            "error",
            ...cloudflareResourceSyntax,
            removalPolicySyntax,
            ...unguardedWorkersAi,
          ],
        },
      },
    ],
    secrets: {
      lines: [
        String.raw`\bOWNER_DISCORD_ID = "[0-9]{17,20}"`,
        String.raw`untrusted comment: minisign public key: [0-9A-F]{16}`,
      ],
      paths: [
        String.raw`(^|/)fixtures/[^/]+\.tgz!`,
        String.raw`/fixtures/actionlint/`,
        String.raw`/audit-workflows/fixtures/`,
        String.raw`/h56m(-presets)?/src/app/fixtures/`,
      ],
    },
    textlint: {
      ignores: [
        "apps/zenn-articles/**",
        "**/src/pages/*/video.md",
        "**/.cache/**",
        "**/fixtures/**",
      ],
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
        "no-exclamation-question-mark": {
          allow: ["ぶいあーる!", "超かぐや姫!", "超かぐや姫！", "Beat This!"],
        },
      },
      rules: { "@r_masseater/preset-ja": { "no-taigendome": false } },
    },
    markdown: { ignores: ["apps/zenn-articles/**", "**/src/pages/*/video.md"] },
    run: {
      remoteCache: "https://task-cache.masseater.dev/projects/masseater.dev",
      tasks: { "db-check-all": "vp run -r db:check" },
    },
  }),
  skills: {
    "artouc/stop-describe-ui": {
      commit: "251a859f6e40645030e1ae69fa4b501c851eac9c",
      root: "skills",
      skills: ["stop-describing-ui"],
    },
    "better-auth/skills": {
      commit: "20c9e88a5c007461a703f1c213572b073196113e",
      skills: [
        "better-auth-best-practices",
        "better-auth-security-best-practices",
        "email-and-password-best-practices",
      ],
    },
    "cloudflare/skills": {
      commit: "ff191de7d903788eceaf516a514ae7d3b56b924a",
      root: "skills",
      skills: ["cloudflare", "workers-best-practices"],
    },
    "Effect-TS/skills": {
      commit: "155c50c911f9c99c294ef8a4461981c5bbe6453e",
      root: "skills",
      skills: ["effect-ts"],
    },
    "elysiajs/skills": {
      commit: "1466d85aa4f2a0fec91f71311e65bbfa91aa7dc5",
      skills: ["elysiajs"],
    },
    "feature-sliced/skills": {
      commit: "5e95aaebb84541742686e56352b7569acf4306f1",
      skills: ["feature-sliced-design"],
    },
    "GoogleChrome/modern-web-guidance": {
      commit: "2b4aa13a72dd47cd135b06ce5abfccd92e19b24f",
      root: "skills",
      skills: ["modern-web-guidance"],
    },
    "masseater/skills": {
      commit: "80c1c6f094c50d45611bf350d020293a0a7f60ba",
      root: "plugins/masseater-skills/skills",
      skills: "all",
    },
    "mkosir/typescript-style-guide": {
      commit: "170074a0df9b07f4a4a78e3596ec1edf06a14da7",
      root: "skills",
      skills: ["typescript-discriminated-unions", "typescript-variables"],
    },
    "nanaism/yomiyasu": {
      commit: "3979c750b5e1fe9892bd47bb354f0fb51d534ff2",
      root: "skills",
      skills: ["yomiyasu"],
    },
    "obra/superpowers": {
      commit: "22f0b463e7a5e579904dd6211a520321035526f7",
      root: "skills",
      skills: ["systematic-debugging", "verification-before-completion"],
    },
    "philtzjp/skills": {
      commit: "c564444ab816e9f1eb69f6625831ceb3a4bcadad",
      root: ".agents/skills",
      skills: [
        "analytics",
        "api-design",
        "commit-and-git",
        "conventions",
        "cursor-hook-authoring",
        "data-migration",
        "db",
        "e2e-testing",
        "e2etest",
        "errorpage",
        "github",
        "google-analytics",
        "hono",
        "issue-branch-pr-flow",
        "japanese",
        "japanese-writing",
        "knowledge-elicitation",
        "m4l-project",
        "refresh-skills",
        "skill-escalation",
        "skill-selection",
        "turborepo",
        "typescript-monorepo",
      ],
    },
    "remotion-dev/skills": {
      commit: "a3f4098a2afd0e13f6a6f8c8760e275f75457ea9",
      root: "skills",
      skills: [
        "remotion-best-practices",
        "remotion-captions",
        "remotion-markup",
        "remotion-multimedia",
        "remotion-render",
        "remotion-studio",
      ],
    },
    "shadcn-ui/ui": {
      commit: "0e5b2e621a9ee4cf6a604bbe6c5c0d5b70561eb4",
      root: "skills",
      skills: ["shadcn"],
    },
  },
  msch: {
    workspaceAgentsMd: true,
    comments: { allow: ["(?:note|pass|text|glyphs|dispatch):"] },
  },
});
