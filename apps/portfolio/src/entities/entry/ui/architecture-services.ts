import { Array as Arr, pipe } from "effect";

import type { GlyphName } from "./architecture-glyph";
import { APP_LEFT, APP_STEP, COLUMN, OBSERVE_STEP, ROW } from "./architecture-grid";
import type { Point, ServiceSpec } from "./architecture-grid";

const cell = (column: keyof typeof COLUMN, row: keyof typeof ROW): Point => ({
  x: COLUMN[column],
  y: ROW[row],
});

const apps = [
  ["mosaic", "/mosaic/", "thumb-mosaic", "workers"],
  ["bench", "/decision-bench/", "mst-ja-decision-bench", "workers"],
  ["bisect", "/injection-bisect/", "decision-experiments", "workers"],
  ["ocr", "/ocr-decide/", "decision-experiments", "workers"],
  ["mirucord", "mirucord.", "Discord を読む MCP", "discord"],
  ["konomi", "konomi.", "好みを伝える MCP", "workers"],
  ["medley", "medley-manager.", "メドレーの DB", "workers"],
  ["personal", "personal.", "Access の内側", "workers"],
  ["portal", "mcp.", "MCP ポータル", "workers"],
] as const satisfies readonly (readonly [string, string, string, GlyphName])[];

const observers = [
  ["rum", "Web Analytics", "全ページのビーコン", "chart"],
  ["observability", "Workers Observability", "ログ · トレースを保存", "activity"],
  ["logpush", "Logpush", "アカウントの全 Worker", "cloudflare"],
  ["r2", "R2 · WorkerLogs", "失敗は全件 · 通常は 1% · 30 日", "archive"],
  ["telemetry", "CI Telemetry Worker", "ジョブとステップの時間", "timer"],
  ["zap", "ZAP", "本番を毎回スキャン", "zap"],
] as const satisfies readonly (readonly [string, string, string, GlyphName])[];

const services: readonly ServiceSpec[] = [
  {
    id: "claude",
    group: "dev",
    at: cell("first", "upper"),
    name: "Claude Code",
    note: "記事と変更を書いて PR",
    glyph: "claude",
  },
  {
    id: "repo",
    group: "dev",
    at: cell("second", "upper"),
    name: "GitHub",
    note: "masseater/masseater.dev",
    glyph: "github",
  },
  {
    id: "actions",
    group: "dev",
    at: cell("third", "upper"),
    name: "GitHub Actions",
    note: "main で verify と deploy",
    glyph: "actions",
  },
  {
    id: "openrouter",
    group: "dev",
    at: cell("fourth", "upper"),
    name: "OpenRouter",
    note: "decision lint の判定",
    glyph: "openrouter",
  },
  {
    id: "mcp",
    group: "dev",
    at: cell("first", "lower"),
    name: "personal-space MCP",
    note: "Sloppedia の記事を PR で足す",
    glyph: "mcp",
  },
  {
    id: "iac",
    group: "dev",
    at: cell("fourth", "lower"),
    name: "GitHub の設定",
    note: "alchemy.github.ts で全リポ",
    glyph: "settings",
  },
  {
    id: "zenn",
    group: "outside",
    at: cell("first", "upper"),
    name: "Zenn",
    note: "zenn ブランチへ写す",
    glyph: "zenn",
  },
  {
    id: "greasyfork",
    group: "outside",
    at: cell("second", "upper"),
    name: "Greasy Fork",
    note: "userscript を main から同期",
    glyph: "greasyfork",
  },
  {
    id: "otherCi",
    group: "outside",
    at: cell("first", "lower"),
    name: "ほかのリポの CI",
    note: "全リポが鍵をここで受け取る",
    glyph: "actions",
  },
  {
    id: "waf",
    group: "edge",
    at: cell("first", "upper"),
    name: "WAF カスタムルール",
    note: "スキャナーの探りを弾く",
    glyph: "shield",
  },
  {
    id: "site",
    group: "edge",
    at: cell("second", "upper"),
    name: "Static Site Worker",
    note: "site.worker.ts",
    glyph: "workers",
  },
  {
    id: "assets",
    group: "edge",
    at: cell("third", "upper"),
    name: "静的アセット",
    note: "全ページをプリレンダー",
    glyph: "file",
  },
  {
    id: "stars",
    group: "edge",
    at: cell("fourth", "upper"),
    name: "D1 · Stars",
    note: "記事の star を数える",
    glyph: "database",
  },
  {
    id: "honeypot",
    group: "edge",
    at: cell("second", "lower"),
    name: "Honeypot Worker",
    note: "/.env · /wp-login.php",
    glyph: "workers",
  },
  {
    id: "ae",
    group: "edge",
    at: cell("third", "lower"),
    name: "Analytics Engine",
    note: "引っかかった探りを記録",
    glyph: "chart",
  },
  {
    id: "brokerWorker",
    group: "broker",
    at: cell("first", "upper"),
    name: "Credential Broker",
    note: "OIDC と引き換えに短命トークン",
    glyph: "workers",
  },
  {
    id: "secrets",
    group: "broker",
    at: cell("second", "upper"),
    name: "Secrets Store",
    note: "親トークン · API キー",
    glyph: "key",
  },
  {
    id: "appDb",
    group: "broker",
    at: cell("first", "lower"),
    name: "D1 · GitHubApp",
    note: "App の鍵 · 毎日 3:17 に更新",
    glyph: "database",
  },
  ...pipe(
    apps,
    Arr.map(([id, name, note, glyph], index): ServiceSpec => ({
      id,
      group: "apps",
      at: { x: APP_LEFT + index * APP_STEP, y: ROW.upper },
      name,
      note,
      glyph,
    })),
  ),
  ...pipe(
    observers,
    Arr.map(([id, name, note, glyph], index): ServiceSpec => ({
      id,
      group: "observe",
      at: { x: COLUMN.first + index * OBSERVE_STEP, y: ROW.upper },
      name,
      note,
      glyph,
    })),
  ),
];

export { apps, services };
