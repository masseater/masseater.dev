---
title: "Rush"
description: "Microsoft の Rush Stack に含まれる、大きな JavaScript と TypeScript のモノレポのための管理の道具。依存のインストール、ポリシー、パッケージの公開、差分のビルドを受け持つ。"
tags: ["モノレポ", "JavaScript", "Microsoft", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Microsoft（Rush Stack）"
  - label: "npm への初めての公開"
    value: "2017年1月3日"
  - label: "最新のリリース"
    value: "5.182.1（2026年10月30日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "rushjs.io"
    href: "https://rushjs.io/"
---

Rush は、大きな JavaScript と TypeScript のモノレポのための管理の道具である[^home]。Microsoft が中心になって開発する Rush Stack の1つである。多くのチームが1つのリポジトリで多くのパッケージを持つ、企業の使い方を想定している。

## 歴史

npm の `@microsoft/rush` は2017年1月3日に初めて公開された[^npm]。ソースは Rush Stack のリポジトリ microsoft/rushstack にあり、その最初のコミットは2015年12月13日である[^repo]。最新のリリースは2026年10月30日の 5.182.1 である[^npm]。

## 機能

Rush は、[pnpm](/sloppedia/pnpm) などを使って依存を入れ、パッケージが宣言していない依存を読めないようにする[^home]。ポリシーでは、使ってよい依存のバージョンや、レビューの要る変更を決める。変更のあったパッケージのバージョンを上げ、npm に公開するのも Rush の役目である[^home]。

ビルドは、各パッケージを依存の順に並列で動かす。変わっていないパッケージは飛ばす[^home]。

## 可視化

Rush は依存のグラフを描く道具を持たない。[monorepo.tools](/sloppedia/monorepo-tools) の比較表は、「可視化の道具は付いてこないが、自分で書ける」としている。

## 関連項目

- [Lage](/sloppedia/lage)
- [pnpm](/sloppedia/pnpm)
- [monorepo.tools](/sloppedia/monorepo-tools)

[^home]: Microsoft「[Rush](https://rushjs.io/)」。2026年11月9日に閲覧。

[^npm]: 「[@microsoft/rush](https://www.npmjs.com/package/@microsoft/rush)」npm。2026年11月9日に閲覧。

[^repo]: 「[microsoft/rushstack](https://github.com/microsoft/rushstack)」GitHub。2026年11月9日に閲覧。
