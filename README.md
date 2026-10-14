# masseater.dev

masseater が作ったものと書いた文章を載せる個人サイトである。

## 公開先

- サイト: https://masseater.dev
- RSS: https://masseater.dev/feed.xml
- Zenn: https://zenn.dev/masseater

## 記事を書く

記事は `apps/portfolio/content/<カテゴリ>/<slug>.md` に置くと、`https://masseater.dev/<カテゴリ>/<slug>` で公開される。
カテゴリは、作ったものを載せる `projects`、まとまった文章の `blogs`、短いメモの `scraps` から選ぶ。

先頭の frontmatter には次を書く。

```yaml
title: タイトル
description: 一覧と OGP に出す説明
date: 2026-10-12
tags: [tag]
published: true
```

`published: false` にした記事は、開発サーバーでだけ表示される。
画像は `apps/portfolio/public/` に置く。

main に入ると、verify が通ったあとに本番へデプロイされる。

## Zenn に出す

Zenn の記事は `apps/zenn-articles/articles/`、本は `books/`、画像は `images/` に置く。
main の verify が通ると、中身が `zenn` ブランチの直下へ写され、Zenn がそのブランチから取り込む。
masseater.dev のサイトには表示されない。

## 手元で確かめる

前提として、Vite+ の `vp` と Cloudflare のアカウントが要る。
Cloudflare の認証情報は Alchemy のプロファイルに入れる。

```sh
vp install
cp .env.example .env
vp exec --filter portfolio alchemy profile edit --add Cloudflare
cd apps/portfolio
vp run dev
```

`.env` の `OPENROUTER_API_KEY` には、`vp check` の判定に使う OpenRouter のキーを書く。
開発サーバーが表示する URL を開き、書いた記事がカテゴリの一覧に出れば確かめは終わる。

## 最初に一度だけ行う設定

- GitHub の secrets とルールセットは、[masseater/skills](https://github.com/masseater/skills) の `setup-template` スキルの手順で入れる
- Zenn の GitHub 連携では、デプロイ対象のブランチを `zenn` にする
