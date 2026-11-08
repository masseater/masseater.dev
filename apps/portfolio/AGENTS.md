# Architecture Overview

masseater.dev 本体サイトである。ブログ、Sloppedia、プロジェクト紹介を配信する。技術は TanStack Start で、Cloudflare Workers 上で動く。

## 1. システムの概略図

```text
[訪問者] --> [配信 Worker] --> [サイト本体] --> [D1 Stars]
                                |
                                +--> [atproto へ記事の発行情報を出す]
```

## 2. 中心の部品

### サイト本体

説明: 記事の描画とルーティングを担う。記事の中身はアプリ内のコンテンツとして持つ。ビルド時に取り込む。
技術: TanStack Start、React。
境界: src は Feature-Sliced Design の層で分ける。層の違反は steiger が落とす。

### 配信 Worker

説明: リクエストの入口である。セキュリティヘッダーの付与を担う。
技術: Cloudflare Workers。

### CI テレメトリ Worker

説明: CI の実行情報を集める小さな Worker である。本体のスタックとは別にデプロイする。

## 3. データストア

### Stars

種類: Cloudflare D1。
用途: スター機能の保存。

## 4. 外部の連携

atproto（site.standard）: ブログの発行情報をプロトコル側へ公開する。CI の deploy で認証情報があるときだけ実行される。

## 5. セキュリティ

セキュリティヘッダー: 配信 Worker が応答に付与する。

## 6. デプロイと基盤

基盤: Cloudflare Workers、D1。
CI/CD: GitHub Actions の deploy ジョブから Alchemy で本番（prod）へ適用する。ゾーンとトレースは同じ workspace 内の別スタックである。
デプロイ先: masseater.dev。www はリダイレクトする。
