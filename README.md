# masseater.dev

masseater が作ったものと書いた文章を載せる個人サイトである。

## 公開先

- サイト: https://masseater.dev
- Sloppedia: https://masseater.dev/sloppedia/
- npm の sloppedia（Sloppedia の見た目を他のサイトで使うパッケージ）: https://www.npmjs.com/package/sloppedia
- 単体のページ（`apps/labs`）: https://masseater.dev/satsuei-lab/（夕景カット撮影ラボ）、https://masseater.dev/split-pad/（背面打ちスプリットパッド）、https://masseater.dev/pod-rattle/（Pod Rattle）
- Pod Rattle の VST3 / CLAP プラグイン（`apps/pod-rattle-plugin`）: https://github.com/masseater/masseater.dev/releases?q=pod-rattle
- サムネのモザイクアート: https://masseater.dev/mosaic/ （キャラごとのページは `libs/mosaic/src/characters.json` の slug で `/mosaic/<slug>`）
- RSS: https://masseater.dev/feed.xml
- Standard.site（blog の記事を AT Protocol に載せたもの）: https://bsky.app/profile/masseater.bsky.social
- Zenn: https://zenn.dev/masseater
- 記憶の MCP サーバー: https://memory.masseater.dev/mcp

## 記事を書く

記事は `apps/portfolio/content/<カテゴリ>/<slug>.md` に置くと、`https://masseater.dev/<カテゴリ>/<slug>` で公開される。
カテゴリは、作ったものを載せる `projects`、まとまった文章の `blogs`、百科事典もどきの `sloppedia` から選ぶ。

先頭の frontmatter には次を書く。

```yaml
title: タイトル
description: 一覧と OGP に出す説明
tags: [tag]
published: true
```

`sloppedia` の記事では `tags` がカテゴリになり、`infobox` に `label`・`value`・`href` の並びを書くと記事の右に情報の表が出る。

`published: false` にした記事は、開発サーバーでだけ表示される。
画像は `apps/portfolio/public/` に置く。

main に入ると、verify が通ったあとに本番へデプロイされる。

## 3 時 12 分の Discord bot

`apps/three-twelve` は、毎日 3 時 12 分（JST）に bot の入ったサーバーのボイスチャンネルへ来て「3時12分」を流し、流し終えると抜ける。
操作は https://masseater.dev/three-twelve/ の API で行い、どれも `Authorization: Bot <トークン>` を付ける。

`PUT /three-twelve/token` は、持ち主の Discord アプリのトークンだけを受け付けて保存し、招待のリンクを返す。
`PUT /three-twelve/audio` に Ogg Opus の曲を送ると、次の 3 時 12 分からその曲を流す。
`POST /three-twelve/play` を送ると 1 分後に試しの再生をする。`GET /three-twelve/status` は前回の結果を返す。

## 記憶の MCP サーバー

`apps/memory` は、プロジェクトの記憶を保存して探す MCP サーバーである。
Claude のコネクタに https://memory.masseater.dev/mcp を足し、持ち主のパスキーでログインして使う。
ツールは `save`・`update`・`search` の 3 つである。

ツールの呼び出しは 1 回ずつ Analytics Engine のデータセット `masseater_dev_memory_tool_calls` に入る。
`blob1` からツール名・結果・エラーの種類・OAuth のクライアント・プロジェクト・User-Agent、`double1` から所要時間（ミリ秒）・入力のバイト数・出力のバイト数・結果の件数が並ぶ。
同じ内容は Workers Logs にも `event: mcp_tool_call` で出る。

```sh
curl -sS "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -d "SELECT blob1 AS tool, blob2 AS status, count() AS calls, avg(double1) AS ms, avg(double4) AS results
      FROM masseater_dev_memory_tool_calls WHERE timestamp > NOW() - INTERVAL '7' DAY GROUP BY tool, status"
```

## Zenn に出す

Zenn の記事は `apps/zenn-articles/articles/`、本は `books/`、画像は `images/` に置く。
main の verify が通ると Zenn に公開される。masseater.dev のサイトには載らない。

## モザイクアート

`apps/mosaic` のサイトと、キャラごとの画像を配る Worker は Alchemy の `thumb-mosaic` スタックで置く。
キャラは `libs/mosaic/src/characters.json` に足す。`tools/mosaic` の Python が VocaDB から曲を集めてモザイクを解き、main の verify のあとにキャラごとのジョブが画像を、最後のジョブがサイトをデプロイする。
このジョブは mosaic のファイルか lockfile が変わった push と、毎週の定期実行でだけ動く。

## 手元で確かめる

前提は Vite+ の `vp` と Cloudflare のアカウントである。

```sh
vp install
cp .env.example .env
vp exec --filter portfolio alchemy profile edit --add Cloudflare
cd apps/portfolio
vp run dev
```

`.env` の `OPENROUTER_API_KEY` には、`vp check` の判定に使う OpenRouter のキーを書く。

## 最初に一度だけ行う設定

GitHub の secrets とルールセットは、[masseater/skills](https://github.com/masseater/skills) の
`project-checklist` スキルの setup の手順で入れる。
Zenn の GitHub 連携では、デプロイ対象のブランチを `zenn` にする。
