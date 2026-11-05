作業を始める前に `repo-conventions` と `vite-plus` の skill を読み、従う。どちらも masseater/skills にあり、`vp install` が `.agents/skills/` に入れる。

## コマンド

- `vp run verify` は `vp check` と、`vite.config.ts` の `verify` タスクの `dependsOn` に並ぶ検査をすべて動かす。pre-push フックも同じものを動かす。
- `vp check` の decision ルールは `apps/portfolio/src` だけに掛かり、`OPENROUTER_API_KEY` で判定する。
- 1 つのテストは `apps/portfolio` で `vp test run <ファイル>` で動かす。`src/` のテストは `app`、直下の Alchemy まわりのテストは `alchemy` のプロジェクトで動く。

## 構成

- `apps/portfolio` は TanStack Start（RSC）で全ページをプリレンダーし、`Website.StaticSite` で静的サイトとして Cloudflare に置く。記事は `apps/portfolio/content/` の Markdown を `import.meta.glob` で読む。`apps/portfolio/app-name.ts` の `APP_NAME` を変えるとリソースは作り直される。
- 静的サイトの Worker（`site.worker.ts`）は `/api/stars/*` だけを先に受け、blogs の star を D1 に数える。同じ IP からの star は 1 記事 1 つで、IP は `VISITOR_SALT` を混ぜたハッシュで持つ。ほかのリクエストは静的アセットに渡す。
- `alchemy.run.ts` は prod ステージでだけ `edge-guard.ts` と `log-archive.ts` を作る。前者はスキャナーを弾く WAF ルールとハニーポットの Worker を、後者は全 Worker のログを R2 に送る Logpush を持つ。
- `infra/repositories` は個人アカウントの GitHub を管理する `masseater-dev-github` スタックで、main の verify の `github` ジョブが当てる。リポは GitHub App のインストールから実行時に一覧し、コードには private リポの名前を書かない。方針はコードの 1 か所に書き、`visibility` は渡さず公開範囲に触らない。private の名前は `github-token.sh` がログで伏せる。CI にトークンを出す broker（credentials.masseater.dev）も、別のスタック `alchemy.broker.ts` としてここに置き、main の verify の `deploy` ジョブが当てる。リポごとに broker が出す Cloudflare・GitHub・npm の権限は `credential-grants.ts` に書く。
- リポの削除は `delete-repositories` ワークフローを main で手動実行する。名前はイベントのファイルから読んでログで伏せるので、private のリポもコードとログに名前が出ない。
- GitHub のトークンも broker が出す。App は `masseater-manager` だけで、鍵は D1 に置く。鍵の原本は personal-space の secret にあり、personal-space の `github-app-key` ワークフローが `POST https://credentials.masseater.dev/github-app/import` で渡す。broker は鍵で App 自身として名乗れることと持ち主を確かめてから保存する。
- `ci-telemetry.worker.ts` は、`.github/scripts/ci-telemetry.sh` が送るジョブとステップの時間を GitHub の OIDC トークンで確かめ、ログに出す。
- `apps/portfolio/content/sloppedia/` は、Wikipedia 風の個人の百科事典もどき Sloppedia の記事である。`/sloppedia/` の下は `_site` の外にある独自の見た目のページで、`noindex` を付けて sitemap とフィードから外す。旧 `/scraps/` は `public/_redirects` で転送する。
- Sloppedia の見た目は `libs/sloppedia`（npm の `sloppedia`）にあり、portfolio はそれに TanStack Router の Link を渡して使う。npm へは version を上げてから `publish.yml` を main で手動実行して出す。
- `tools/scrap-userscript` は、閲覧中のページについて Sloppedia の記事を書くよう Claude Code のルーチンへ頼むユーザースクリプトである。依頼は personal-space の `https://personal.masseater.dev/scrap-request` に送り、Access のログイン Cookie で通す。ルーチンのトークンはそちらの Worker が持つ。Greasy Fork が main の `release/scrap-request.user.js` を同期するので、ビルド結果もコミットする。ソースとビルド結果が食い違うと test が落ちる。中身を変えたら `package.json` の version を上げる。
- `apps/zenn-articles` はパッケージではない。main の verify が通ると、中身が `zenn` ブランチの直下へ写される。

## 記事

- 記事の日付は frontmatter に書かない。`apps/portfolio/remark-git-date.ts` がビルド時に、そのファイルを最初に追加したコミットの日付を `date` として入れる。未コミットのファイルは当日の日付になる。
- 出典は `[^codmon-retrospective]` のような名前のラベルの脚注で書く。remark-gfm が出現順に番号を振って本文の末尾に出典の一覧としてまとめるので、番号も一覧も手で書かない。
- 出典でないリンクは `[文言](URL)` の埋め込みリンクにし、むき出しの URL を置かない。blogs・sloppedia・projects のどれも同じである。
- Claude との対話を載せるときは、発言を `:::masseater` と `:::claude` のブロックで囲む。`remark-dialogue.ts` がアイコンと名前つきの吹き出しに変える。
- 中身の薄いアイデア段階の blog は、frontmatter に `stage: idea` を付ける。一覧では折りたたみの中に入り、フィードには出ない。
- Sloppedia の記事は personal-space の MCP の `write_sloppedia_article` からも PR で足される。blog を投稿するツールは MCP に意図して足さない。blog は持ち主が推敲してから出すまとまった文章で、AI が書ける経路は Sloppedia だけにしておくためである。
- Sloppedia の記事は百科事典の体裁で書く。冒頭の文を「題名は、〜である。」で始め、出典は名前のラベルの脚注にする。持ち主の意見は「Sloppedia の持ち主の masseater は〜と考えている」のように誰の意見かを書く。

## Cloudflare

- このリポが masseater.dev ゾーンの持ち主で、WAF カスタムルール（prod ステージだけ）と、Cloudflare が返す応答のヘッダの Transform Rule（`alchemy.zone.ts`。broker のトークンで当てる）と、アカウントに 1 つの Logpush のジョブを持つ。Logpush の設定を変えると全 Worker に効く。
