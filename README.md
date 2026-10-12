# masseater.dev

https://masseater.dev のポートフォリオ。mainへのpushでverifyが通ると、`ALCHEMY_STAGE=prod` でCloudflareにデプロイされる。

## セットアップ

```sh
vp install
cp .env.example .env
vp exec --filter portfolio alchemy profile edit --add Cloudflare
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

記事は `apps/portfolio/content/<カテゴリ>/<slug>.md` に置き、`/<カテゴリ>/<slug>` で公開される。
カテゴリは `projects`・`blogs`・`scraps` の3つである。frontmatter は次のとおり。

```yaml
title: タイトル
description: 一覧と OGP に出す説明
date: 2026-10-12
tags: [tag]
published: true
```

`published: false` の記事は開発サーバーでだけ表示される。
画像は `apps/portfolio/public/` に置く。

## Zenn

Zenn に投稿する記事は `apps/zenn-articles/` の `articles/`、本は `books/`、画像は `images/` に置く。
Zenn の GitHub 連携はリポジトリ直下しか読まないため、main の verify が通ると `apps/zenn-articles/` の中身を `zenn` ブランチの直下にコミットする。
Zenn のデプロイ対象ブランチは `zenn` にする。
サイトには表示しない。

## 起動とデプロイ

```sh
cd apps/portfolio
vp run dev
vp run deploy
```
