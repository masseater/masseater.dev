---
title: "Plane (ソフトウェア)"
description: "Issue、サイクル、ロードマップを管理する、セルフホストもできるオープンソースのプロジェクト管理ツール。"
tags: ["オープンソースソフトウェア", "プロジェクト管理"]
published: true
infobox:
  - label: "開発元"
    value: "Plane"
  - label: "リポジトリ"
    value: "makeplane/plane"
    href: "https://github.com/makeplane/plane"
  - label: "種別"
    value: "プロジェクト管理ツール"
  - label: "使われている技術"
    value: "React Router、Django、Node.js"
  - label: "提供形態"
    value: "Plane Cloud、セルフホスト（Docker、Kubernetes）"
  - label: "ライセンス"
    value: "AGPL-3.0"
---

Plane は、Issue の管理、スプリントにあたるサイクルの運用、プロダクトのロードマップの管理をするオープンソースのプロジェクト管理ツールである。ツールそのものの管理に手間を取られないことを掲げている。運営元のクラウド版のほか、自分のサーバーにセルフホストして使える[^github]。

## 機能

README は次の機能を挙げている[^github]。

| 機能       | 内容                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Work Items | ファイルを添付できるリッチテキストのエディタでタスクを作り、下位の属性や関連する Issue を付ける |
| Cycles     | チームの進み具合をバーンダウンチャートなどで追う                                                |
| Modules    | 大きなプロジェクトを小さなモジュールに分ける                                                    |
| Views      | フィルターで必要な Issue だけを表示し、保存して共有する                                         |
| Pages      | AI の機能付きのエディタでアイデアをまとめ、作業項目に変える                                     |
| Analytics  | Plane の全データの傾向をリアルタイムで見る                                                      |

## 提供形態

Plane Cloud に無料のアカウントを作れば、基盤を用意せずに使い始められる。データと基盤を自分で管理したい場合は、Docker か Kubernetes でセルフホストする。インスタンスの管理者は God mode と呼ぶ画面でインスタンスの設定を変える[^github]。

## 技術

フロントエンドに React Router、バックエンドに Django と Node.js を使っている[^github]。

## ライセンス

ライセンスは AGPL-3.0 である[^github]。

[^github]: 「[makeplane/plane](https://github.com/makeplane/plane)」GitHub。
