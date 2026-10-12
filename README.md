# masseater.dev

https://masseater.dev のポートフォリオ。mainへのpushでverifyが通ると、`ALCHEMY_STAGE=prod` でCloudflareにデプロイされる。

## セットアップ

```sh
vp install
cp .env.example .env
vp exec --filter web alchemy profile edit --add Cloudflare
vp run verify
```

Cloudflare の認証情報は環境変数ではなく Alchemy のプロファイル（`~/.alchemy`）で管理する。
デプロイと `.mcp.json` の Cloudflare MCP は、どちらもこのプロファイルの認証情報を使う。

## 環境変数

ルートの `.env` に書く。

| 名前                 | 用途                          |
| -------------------- | ----------------------------- |
| `OPENROUTER_API_KEY` | push 前に走る jev-lint の判定 |

## GitHub の設定

リポジトリの Actions secrets に次を登録する。

| 名前                      | 用途                                       |
| ------------------------- | ------------------------------------------ |
| `OPENROUTER_API_KEY`      | verify ワークフローの jev-lint             |
| `CLAUDE_CODE_OAUTH_TOKEN` | verify 失敗時に Claude Code が自動修正する |
| `CLOUDFLARE_API_TOKEN`    | deploy ジョブの Cloudflare 認証            |
| `CLOUDFLARE_ACCOUNT_ID`   | deploy ジョブのデプロイ先アカウント        |

Settings → Actions → General で「Allow GitHub Actions to create and approve pull requests」を有効にする。
release-pleaseと自動修正がPRを作るためである。

## コンテンツ

記事は `apps/web/content/<カテゴリ>/<slug>.md` に置き、`/<カテゴリ>/<slug>` で公開される。
カテゴリは `projects`・`blogs`・`scraps`・`zenn` の4つである。

`projects`・`blogs`・`scraps` の frontmatter は次のとおり。

```yaml
title: タイトル
description: 一覧と OGP に出す説明
date: 2026-10-12
tags: [tag]
published: true
```

`zenn` は Zenn の frontmatter（`title`・`emoji`・`type`・`topics`・`published`）をそのまま使う。`published: true` の記事には `published_at` が必須で、下書きには要らない。
`published: false` の記事は開発サーバーでだけ表示される。
画像は `apps/web/public/images/` に置き、`/images/...` で参照する。

## 起動とデプロイ

```sh
cd apps/web
vp run dev
vp run deploy
```
