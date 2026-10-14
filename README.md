# masseater.dev

https://masseater.dev のポートフォリオ。mainへのpushでverifyが通ると、`ALCHEMY_STAGE=prod` でCloudflareにデプロイされる。

## 公開先

- ポートフォリオ: https://masseater.dev
- Zenn: https://zenn.dev/masseater

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

| 名前                 | 用途                                            |
| -------------------- | ----------------------------------------------- |
| `OPENROUTER_API_KEY` | `vp check` で走る oxlint-plugin-decision の判定 |

## GitHub の設定

Actions の secrets、Actions による PR 作成の許可、PR を作れる人の制限、既定ブランチのルールセットを gh で設定する。
手順は `setup-template` スキル（[masseater/skills](https://github.com/masseater/skills)）にある。

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
