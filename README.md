# masseater.dev

masseater が作ったものと書いた文章を載せる個人サイトである。

## 公開先

- サイト: https://masseater.dev
- Sloppedia: https://masseater.dev/sloppedia/
- 単体のページ: https://masseater.dev/satsuei-lab/（夕景カット撮影ラボ）、https://masseater.dev/split-pad/（背面打ちスプリットパッド）
- RSS: https://masseater.dev/feed.xml
- Zenn: https://zenn.dev/masseater

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

## Zenn に出す

Zenn の記事は `apps/zenn-articles/articles/`、本は `books/`、画像は `images/` に置く。
main の verify が通ると Zenn に公開される。masseater.dev のサイトには載らない。

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
