---
title: "Feature-Sliced Design"
description: "コードをレイヤー、スライス、セグメントに分割し、それらの間でインポートを制限するフロントエンドアプリケーション向けのアーキテクチャ手法。2024年11月のバージョン 2.1 が最新であり、公式リンターは Steiger である。"
tags: ["ソフトウェア設計", "フロントエンド", "2026年のソフトウェア"]
published: true
infobox:
  - label: "略称"
    value: "FSD"
  - label: "最新のバージョン"
    value: "2.1（2024年11月13日）"
  - label: "公式のリンター"
    value: "Steiger"
  - label: "URL"
    value: "fsd.how"
    href: "https://fsd.how/"
---

Feature-Sliced Design は、フロントエンドアプリケーションのスキャフォールディングのためのアーキテクチャ手法である[^overview]。しばしば FSD と略される。コードをレイヤー、スライス、セグメントに分割し、それらの間のインポートを制限する[^overview]。ルールに加えて、リンター [Steiger](/sloppedia/steiger) やフォルダジェネレーターなどのツールを提供する[^overview]。

## 歴史

ドキュメントでは、featureslices.dev においてバージョン 0.1 および 1.0 を、旧名称の Feature Slices として管理している[^overview]。バージョン 2.0.0 では2023年10月1日にベータラベルが削除された[^v2]。それ以降、本手法はバージョンで追跡されている[^releases]。

バージョン 2.1 は2024年11月13日に`Pages come first!` のタイトルでリリースされた[^v21]。リリースノートでは、本バージョンは既存のプロジェクトを壊さないとされている[^v21]。2026年11月現在、2.1 が最新バージョンである[^releases]。

公式ドキュメントは fsd.how にある[^overview]。FSD チームはまた、feature-sliced/skills リポジトリでバージョン 2.1 向けの AI エージェントスキルを公開している[^skills]。

## レイヤー

FSD には7つのレイヤーがある。表の上にあるレイヤーほど、アプリケーションのより多くの部分を知っている[^layers]。

| レイヤー  | 内容                                                                      |
| --------- | ------------------------------------------------------------------------- |
| App       | ルーティングやグローバルスタイルなど、アプリケーション全体に必要な設定    |
| Processes | 非推奨                                                                    |
| Pages     | ページ全体                                                                |
| Widgets   | UI の大規模なブロック。現在のガイドではこのレイヤーの使用を推奨していない |
| Features  | 複数のページで再利用されるプロダクト機能                                  |
| Entities  | プロジェクトが扱うビジネスエンティティ                                    |
| Shared    | 再利用可能なコード（特にビジネスの詳細から切り離されたコード）            |

Processes レイヤーはバージョン 2.0 で非推奨となった[^v2]。App と Shared にはスライスがなく、直接セグメントに分かれている[^layers]。

## スライスとセグメント

スライスは、ユーザーや注文などのビジネスドメインごとにレイヤーを分割する。セグメントは、技術的な目的ごとにスライスを分割する[^overview]。代表的なセグメントには `ui`、`api`、`model`、`lib`、`config` があるが、標準ではこれらの名称は固定されていない[^overview]。

## インポートルール

スライス内のモジュールは、他のスライスが自身より厳密に下のレイヤーにある場合にのみ、それをインポートできる[^layers]。同一レイヤー内のスライス同士は互いに使用できない[^overview]。App 内および Shared 内のセグメントは、自由に相互にインポートできる[^layers]。

各スライスはパブリック API（通常は re-export を含む `index` ファイル）を提供する[^public-api]。ドキュメントでは、パブリック API を、スライスとそれを利用するコードとの間の契約として説明している[^public-api]。また、Shared におけるワイルドカードによる re-export やバレルファイルは、循環インポートやツリーシェイキングの悪化を招く可能性があるため、注意を促している[^public-api]。

あるエンティティが別のエンティティを真に必要とする場合、FSD では `@x` という専用のパブリック API を通じてクロスインポートが可能である[^public-api]。エンティティ A がエンティティ B に対して `entities/A/@x/B` を宣言すると、これは「A と B のクロス」と読み取られる[^public-api]。ドキュメントでは、これを Entities レイヤーでのみ、かつ限定的な範囲でのみ推奨している[^public-api]。

## ページファースト

バージョン 2.1 の主な変更点は「ページファースト」である[^v21]。他のページでは再利用されない UI、フォーム、データロジックの大きなブロックは、それらを使用しているページのスライス内に保持される[^v21]。ウィジェットも、ウィジェットの外部で不要なコードを保持してよい[^v21]。Shared には、ルート定数や API 呼び出し、企業ロゴなど、アプリケーションに関する情報が含まれるようになった[^v21]。

## ツール

公式リンターは [Steiger](/sloppedia/steiger) であり、2.1 のリリースノートでは本番環境への準備が整ったとされている[^v21]。公式 AI スキルでも、Steiger は公式リンターとして記載されている[^skills]。

## 評価

Sloppedia の持ち主の masseater は、「ページファースト」のデフォルトに従っていない。masseater は、操作別および対象別にページをスライスに分割し、各スライス内にテストやスタイルを保持することを好む。masseater.dev は [Steiger](/sloppedia/steiger) でこれを確認しており、また同一レイヤー上のスライス間のインポートもエラーとして処理する。

## 関連項目

- [モジュール境界](/sloppedia/module-boundaries)
- [モジュール境界ツール](/sloppedia/module-boundary-tools)
- [Steiger](/sloppedia/steiger)

[^overview]: Feature-Sliced Design「[Overview](https://fsd.how/docs/get-started/overview)」。2026年11月15日に閲覧。

[^layers]: Feature-Sliced Design「[Layers](https://fsd.how/docs/reference/layers)」。2026年11月15日に閲覧。

[^public-api]: Feature-Sliced Design「[Public API](https://fsd.how/docs/reference/public-api)」。2026年11月15日に閲覧。

[^releases]: 「[Releases](https://github.com/feature-sliced/documentation/releases)」feature-sliced/documentation。2026年11月15日に閲覧。

[^v2]: 「[Release v2.0.0](https://github.com/feature-sliced/documentation/releases/tag/v2.0.0)」feature-sliced/documentation、2023年10月1日。

[^v21]: 「[Release v2.1: Pages come first!](https://github.com/feature-sliced/documentation/releases/tag/v2.1)」feature-sliced/documentation、2024年11月13日。

[^skills]: 「[feature-sliced/skills](https://github.com/feature-sliced/skills)」GitHub。2026年11月15日に閲覧。
