---
title: "Gradle"
description: "Java や Kotlin などの JVM の言語を中心にしたビルドの道具。ビルドを Groovy か Kotlin で書き、複数のプロジェクトとビルドのキャッシュを扱う。2026年に開発元の会社は Develocity に改称した。"
tags: ["ビルドシステム", "Java", "Kotlin", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Hans Dockter"
  - label: "最初のリリース"
    value: "2008年4月21日"
  - label: "開発"
    value: "Gradle, Inc.（2026年6月から Develocity を名乗る）"
  - label: "最新のリリース"
    value: "9.9.0（2026年11月）"
  - label: "ライセンス"
    value: "Apache License 2.0"
  - label: "URL"
    value: "gradle.org"
    href: "https://gradle.org/"
---

Gradle は、Java や Kotlin などの JVM の言語を中心にしたビルドの道具である[^wikipedia]。Android のアプリの標準のビルドの道具でもある。ビルドの手順を、Groovy か Kotlin のスクリプトで書く。

## 歴史

Gradle は Hans Dockter が作り、2008年4月21日に最初のリリースを出した[^wikipedia]。Dockter らは開発を担う会社 Gradle, Inc. を作った。会社は2026年6月に名前を Develocity に改めた[^rename]。Develocity は、もともと同社の有料の製品の名前である。法人の名前は Gradle, Inc. のままである[^rename]。

最新のリリースは 9.9.0 である[^release-notes]。リリースノートは日付を2026年11月9日と書き、Wikipedia は11月6日としている。9.9.0 では、Kotlin のスクリプトの差分のコンパイルが入った[^release-notes]。

## 仕組み

Gradle は、ビルドをタスクのグラフとして組み、依存の順に動かす。1つのビルドに複数のプロジェクトを含められ、プロジェクトどうしの依存も書ける[^wikipedia]。

ビルドのキャッシュは、同じ入力のタスクの結果を手元や別の機械から戻す。構成のキャッシュは、ビルドの構成の結果を保存し、次のビルドで構成の段を飛ばす。独立したタスクは並列で動く。

『Software Engineering at Google』の分類では、Gradle は何をどの順で動かすかを書くタスク型のビルドシステムに入る。詳しくは「[Blaze と Bazel](/sloppedia/bazel)」を参照。

## monorepo.tools

[monorepo.tools](/sloppedia/monorepo-tools) の比較表は、Gradle を9つの道具の1つに並べている。リポジトリの README が挙げる7つの道具には入っておらず、のちに足された。

## 関連項目

- [Bazel](/sloppedia/bazel)
- [mise](/sloppedia/mise)
- [monorepo.tools](/sloppedia/monorepo-tools)

[^wikipedia]: 「[Gradle](https://en.wikipedia.org/wiki/Gradle)」Wikipedia。2026年11月9日に閲覧。

[^release-notes]: Gradle「[Gradle 9.9.0 Release Notes](https://docs.gradle.org/current/release-notes.html)」。2026年11月9日に閲覧。

[^rename]: 「[The Company Formerly Known as Gradle](https://blog.gradle.org/the-company-formerly-known-as-gradle)」Gradle Blog、2026年7月17日。
