<!-- intent-skills:start -->
## Skill Loading

Use the repository’s installed Intent. If it is unavailable, report the missing dependency instead of downloading a replacement.
Before editing files for a substantial task:
- Run `pnpm exec intent list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm exec intent load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## コマンド

- `vp run verify` は `vp check` と、`vite.config.ts` の `verify` タスクの `dependsOn` に並ぶ検査をすべて動かす。pre-push フックも同じものを動かす。
- `vp check` の decision ルールは `apps/portfolio/src` だけに掛かり、`OPENROUTER_API_KEY` で判定する。
- 1 つのテストは `apps/portfolio` で `vp test run <ファイル>` で動かす。`src/` のテストは `app`、直下の Alchemy まわりのテストは `alchemy` のプロジェクトで動く。

## 構成

- `apps/portfolio` は TanStack Start（RSC）で全ページをプリレンダーし、`Website.StaticSite` で静的サイトとして Cloudflare に置く。記事は `apps/portfolio/content/` の Markdown を `import.meta.glob` で読む。
- 静的サイトの Worker（`site.worker.ts`）は `/api/stars/*` だけを先に受け、blogs と scraps の star を D1 に数える。同じ IP からの star は 1 記事 1 つで、IP は `VISITOR_SALT` を混ぜたハッシュで持つ。ほかのリクエストは静的アセットに渡す。
- `alchemy.run.ts` は prod ステージでだけ `edge-guard.ts` と `log-archive.ts` を作る。前者はスキャナーを弾く WAF ルールとハニーポットの Worker を、後者は全 Worker のログを R2 に送る Logpush を持つ。
- `ci-telemetry.worker.ts` は、`.github/scripts/ci-telemetry.sh` が送るジョブとステップの時間を GitHub の OIDC トークンで確かめ、ログに出す。
- `apps/zenn-articles` はパッケージではない。main の verify が通ると、中身が `zenn` ブランチの直下へ写される。

## 記事

- 記事の日付は frontmatter に書かない。`apps/portfolio/remark-git-date.ts` がビルド時に、そのファイルを最初に追加したコミットの日付を `date` として入れる。未コミットのファイルは当日の日付になる。
- 出典は `[^codmon-retrospective]` のような名前のラベルの脚注で書く。remark-gfm が出現順に番号を振って本文の末尾に出典の一覧としてまとめるので、番号も一覧も手で書かない。
- 出典でないリンクは `[文言](URL)` の埋め込みリンクにし、むき出しの URL を置かない。blogs・scraps・projects のどれも同じである。
- Claude との対話を載せるときは、発言を `:::masseater` と `:::claude` のブロックで囲む。`remark-dialogue.ts` がアイコンと名前つきの吹き出しに変える。
- 中身の薄いアイデア段階の blog は、frontmatter に `stage: idea` を付ける。一覧では折りたたみの中に入り、フィードには出ない。
- scrap は personal-space の MCP の `post_scrap` からも PR で足される。blog を投稿するツールは MCP に意図して足さない。blog は持ち主が推敲してから出すまとまった文章で、思いつきをそのまま出せる経路は scrap だけにしておくためである。

## 環境変数

- 環境変数は環境ごとに変わる値だけにする。変わらない値はコードか Alchemy の設定に、ツールにフラグがあればフラグにする。

## Cloudflare

- Workers Paid プランを前提にする。
- このリポが masseater.dev ゾーンの持ち主で、WAF カスタムルール（prod ステージだけ）と、アカウントに 1 つの Logpush のジョブを持つ。Logpush の設定を変えると全 Worker に効く。
- Worker にはすべて `logpush: true` を付ける。
- Bot Fight Mode は使わない。

## ライブラリ

- ライブラリが型を提供する値は、その型のまま `Schema.decode*` に渡す。
- ライブラリが export する型・スキーマ・enum・定数を書き写さない。
- 外部 API のクライアントは手で包まず、Effect 公式のパッケージ、distilled.cloud（Cloudflare は `@distilled.cloud/cloudflare`）、公開 OpenAPI から `@effect/openapi-generator` で生成、の順に選ぶ。

## PR とマージ

- PR のレビュー、PR ごとの CI・動作検証・デプロイはしない。動作は本番で確かめる。
- マージ前に base を取り込み、手元の `vp run verify` を通してから自分でマージする。マージしてよいかは聞かない。ルールセットのバイパスや `--admin` は使わない。

## oxlint-plugin-decision

- 有料の decider は、無料の `openrouter/respan/span-01-lite` で判定できないルールだけに使う。判定できるかは、正解の分かる違反例と違反でない例を、キャッシュを消して `OXLINT_DECISION_EXPLAIN=json` で確かめる。
- ルールが使うモデルは、ユーザーの指示なしに変えない。
- 確信できるものだけを違反にする。取りこぼしは許容し、閾値を下げて拾いにいかない。

## 計測

- 推測せず計測する。実装や修正の前に本番で事実を確かめ、その結果だけで判断する。
- 機能開発の前に、AI が自分でデバッグできる仕組み（再現手段、ログやスパン、それを読む経路）を作る。
- 時間かお金を使う処理はすべてスパンにする。Workers 以外は `OtlpTracer.layerFromConfig` で出す。計測のためだけにコマンドやプロセスを包まない。
- ワークフローの最後には `.github/scripts/ci-telemetry.sh` を動かすジョブを置く。

## 脆弱性

- ZAP のアラートは警告も含めすぐ直す。誤検知だけを `.github/zap/rules.tsv` に書く。
- `audit` は `vp pm audit --fix` で直す。修正版の無い勧告だけを `auditConfig.ignoreGhsas` に載せ、理由をコミットメッセージに書く。

## 公開先

- デプロイ先や外部公開しているもの（サイト、API、npm パッケージなど）があれば、その URL を README に一覧で載せる。

## スキル

- 複数リポで使う自作スキルは masseater/skills に置き、skills CLI で入れる。
