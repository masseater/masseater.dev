作業を始める前に `repo-conventions` と `vite-plus` の skill を読み、従う。どちらも masseater/skills にあり、`vp install` が `.agents/skills/` に入れる。

## コマンド

- `vp run verify` は `vp check` と、`vite.config.ts` の `verify` タスクの `dependsOn` に並ぶ検査をすべて動かす。pre-push フックも同じものを動かす。
- `vp check` の decision ルールは `apps/portfolio/src` だけに掛かり、`OPENROUTER_API_KEY` で判定する。
- 1 つのテストは、そのパッケージのディレクトリで `vp test run <ファイル>` で動かす。

## 構成

- `apps/portfolio` は TanStack Start（RSC）で全ページをプリレンダーし、`Website.StaticSite` で静的サイトとして Cloudflare に置く。記事は `apps/portfolio/content/` の Markdown を `import.meta.glob` で読む。`apps/portfolio/app-name.ts` の `APP_NAME` を変えるとリソースは作り直される。
- `apps/portfolio` の直下にはスタックと設定だけを置き、Worker は `worker/`、Vite と Markdown のプラグインは `vite-plugins/`、手で動かすスクリプトは `scripts/` に置く。
- 静的サイトの Worker（`worker/site.worker.ts`）は `/api/stars/*` だけを先に受け、blogs の star を D1 に数える。同じ IP からの star は 1 記事 1 つで、IP は `VISITOR_SALT` を混ぜたハッシュで持つ。ほかのリクエストは静的アセットに渡す。
- サイトを出すためのリソースは `apps/portfolio` のスタックに近接して置く。ゾーンやアカウント全体に効く部品は `infra/cloudflare-account` に置き、`apps/portfolio` のスタックが名前を渡して作る。`alchemy.run.ts` は prod ステージでだけ `edge-guard.ts`・`log-archive.ts`・`web-analytics-reader.ts` を作る。`edge-guard.ts` はスキャナーを弾く WAF ルールとハニーポットの Worker を、`log-archive.ts` は全 Worker のログを R2 に送る Logpush を持つ。トレースの送信先は、`alchemy.traces.ts` のスタックが `@r_masseater/workers-tracing` の `traceSink` で作る。
- `infra/repositories` は個人アカウントの GitHub を管理する `masseater-dev-github` スタックで、main の verify の `github` ジョブが当てる。リポは GitHub App のインストールから実行時に一覧し、コードには private リポの名前を書かない。方針はコードの 1 か所に書き、`visibility` は渡さず公開範囲に触らない。private の名前は `github-token.sh` がログで伏せる。CI にトークンを出す broker（credentials.masseater.dev）も、別のスタック `alchemy.broker.ts` としてここに置き、main の verify の `deploy` ジョブが当てる。リポごとに broker が出す Cloudflare・GitHub・npm の権限は `credential-grants.ts` に書く。
- リポの削除は `delete-repositories` ワークフローを main で手動実行する。名前はイベントのファイルから読んでログで伏せるので、private のリポもコードとログに名前が出ない。
- GitHub のトークンも broker が出す。App は `masseater-manager` だけで、鍵は D1 に置く。鍵の原本は personal-space の secret にあり、personal-space の `github-app-key` ワークフローが `POST https://credentials.masseater.dev/github-app/import` で渡す。broker は鍵で App 自身として名乗れることと持ち主を確かめてから保存する。
- `apps/portfolio/worker/ci-telemetry.worker.ts` は、`.github/scripts/ci-telemetry.sh` が送るジョブとステップの時間を GitHub の OIDC トークンで確かめ、ログに出す。
- `apps/portfolio/content/sloppedia/` は、Wikipedia 風の個人の百科事典もどき Sloppedia の記事である。`/sloppedia/` の下は、サイトの背景を持つ `_stage` レイアウトの外にある独自の見た目のページで、`noindex` を付けて sitemap とフィードから外す。旧 `/scraps/` は `public/_redirects` で転送する。
- Sloppedia の見た目は `libs/sloppedia`（npm の `sloppedia`）にあり、portfolio はそれに TanStack Router の Link を渡して使う。npm へは version を上げてから `publish.yml` を main で手動実行して出す。
- `tools/scrap-userscript` は、閲覧中のページについて Sloppedia の記事を書くよう Claude Code のルーチンへ頼むユーザースクリプトである。依頼は personal-space の `https://personal.masseater.dev/scrap-request` に送り、Access のログイン Cookie で通す。ルーチンのトークンはそちらの Worker が持つ。Greasy Fork が main の `release/scrap-request.user.js` を同期するので、ビルド結果もコミットする。ソースとビルド結果が食い違うと test が落ちる。中身を変えたら `package.json` の version を上げる。
- `apps/labs` は React を使わない単体のページ（`/satsuei-lab/`・`/split-pad/`・`/pod-rattle/`）で、`pages/<名前>/index.html` を Vite の multi-page でバンドルし、静的アセットだけの Worker を masseater.dev のルートに載せる。three や d3 は npm から import し、inline script は置かない。ページを足したら `pages.ts` の `PAGES` に足す。
- `libs/rpp-kit` は REAPER の `.rpp` を読むパーサーと Vite プラグインと TypeScript の content mapper で、`apps/rpp-kit-demo` がそれを使うデモを `/rpp-kit/` に載せる。スタック名と `APP_NAME` は元のリポの `rpp-kit` のままにしている。
- `apps/three-twelve` は毎日 3 時 12 分（JST）に、bot の入ったサーバーで人のいるボイスチャンネルへ入って曲を 1 回流し、抜ける Discord bot である。Worker の cron が Durable Object の alarm を仕掛け、alarm が Cloudflare Containers で `player/main.ts`（discord.js）を exec する。bot のトークンは `PUT /three-twelve/token` で DO に、曲（Ogg Opus）は `PUT /three-twelve/audio` で R2 に置く。トークンは持ち主の Discord アプリのものだけを受け付ける。曲は著作物なのでリポに入れない。
- `apps/pod-rattle-plugin` は labs の Pod Rattle を Rust（nih-plug）で VST3・CLAP にしたもので、音の本体は `libs/pod-rattle-engine` にある。Rust はルートの Cargo ワークスペースに置き、crate ごとに最小の package.json と `vite.config.ts` の `cargo` タスク（fmt・clippy・テスト）を持たせて、ルートの verify から vp のタスクとキャッシュで動かす。crate を足したら同じ形で package.json と `cargo` タスクを作り、verify の `dependsOn` に足す。`cargo xtask bundle-all --release` が `target/bundled/` に出す。`pod-rattle` ワークフローは main への push ごとに 3 OS でビルドして pluginval と clap-validator に通す。release-please が `pod-rattle-v<版>` で出し、zip を付ける。
- オーディオスレッドで確保をしない。配列は初期化で確保し、`no_alloc` テストで確かめる。
- parity テストの参照音は、`tools/pod-rattle-parity` が labs のページから `createEngine` を切り出して鳴らした音である。labs の音を変えたら `libs/pod-rattle-engine` も合わせる。計算の順序を変えると標本単位で一致しなくなるので、速くするときも浮動小数点の演算順は保つ。いずれ labs が `libs/pod-rattle-engine` を wasm で鳴らし、エンジンを 1 本にする。
- `apps/watashi-mcp` は、持ち主の個人データを扱うツールを 1 つにまとめた MCP サーバー（`watashi.masseater.dev/mcp`）で、プロジェクトの記憶と ToDo を D1 に置く。コードは公開し、データは D1 にだけ置く。認証は better-auth の OAuth とパスキーで、パスキーを登録できるのは招待の文字列を持つ最初の 1 人だけである。ツールの呼び出しはすべて Analytics Engine の `masseater_dev_watashi_tool_calls` と Workers Logs に記録する。
- `apps/zenn-articles` はパッケージではない。main の verify が通ると、中身が `zenn` ブランチの直下へ写される。

## 記事

- 記事の日付は frontmatter に書かない。`apps/portfolio/vite-plugins/markdown/remark-git-date.ts` がビルド時に、そのファイルを最初に追加したコミットの日付を `date` として入れる。未コミットのファイルは当日の日付になる。
- 出典は `[^codmon-retrospective]` のような名前のラベルの脚注で書く。remark-gfm が出現順に番号を振って本文の末尾に出典の一覧としてまとめるので、番号も一覧も手で書かない。
- 出典でないリンクは `[文言](URL)` の埋め込みリンクにし、むき出しの URL を置かない。blogs・sloppedia・projects のどれも同じである。
- Claude との対話を載せるときは、発言を `:::masseater` と `:::claude` のブロックで囲む。`remark-dialogue.ts` がアイコンと名前つきの吹き出しに変える。
- 中身の薄いアイデア段階の blog は、frontmatter に `stage: idea` を付ける。一覧では折りたたみの中に入り、フィードには出ない。
- Sloppedia の記事は personal-space の MCP の `write_sloppedia_article` からも PR で足される。blog を投稿するツールは MCP に意図して足さない。blog は持ち主が推敲してから出すまとまった文章で、AI が書ける経路は Sloppedia だけにしておくためである。
- Sloppedia の記事どうしは `[語](/sloppedia/<slug>)` でつなぐ。独立した記事にすべき語は、記事がまだ無くてもつなぐ。`remark-wiki-link.ts` がビルド時に、記事があればリンク、無ければ赤字にする。新しい記事の slug は、既存の記事がその題材に張ったリンクの slug に合わせる。
- Sloppedia の記事は百科事典の体裁で書く。冒頭の文を「題名は、〜である。」で始め、出典は名前のラベルの脚注にする。持ち主の意見は「Sloppedia の持ち主の masseater は〜と考えている」のように誰の意見かを書く。

## Cloudflare

- このリポが masseater.dev ゾーンの持ち主で、WAF カスタムルール（prod ステージだけ）と、Cloudflare が返す応答のヘッダの Transform Rule（`alchemy.zone.ts`。broker のトークンで当てる）と、アカウントに 1 つの Logpush のジョブを持つ。Logpush の設定を変えると全 Worker に効く。
